"""Build, fully validate, and publish Kobo dictionaries. Runs on Windows and Unix."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def build(selection):
    versions = json.loads(subprocess.check_output(
        ['node', '-e', 'console.log(JSON.stringify(require("./format/config").versions))'], cwd=ROOT))
    selected = [version for version in versions if selection in ('all', version['id'])]
    if not selected:
        raise ValueError(f'Unknown version: {selection}')
    # Check dependencies before producing or replacing artifacts.
    tools = {name: importlib.metadata.version(name) for name in ('pyglossary', 'marisa-trie')}
    results = []
    for version in selected:
        run('node', 'format/export.js', version['id'])
        work = Path(version['workDir'])
        stage = Path(tempfile.mkdtemp(prefix='package-', dir=work))
        archive = stage / 'dict.kobo.zip'
        try:
            # PyGlossary 5.0.8 has a console entry point, but no package __main__.
            run(sys.executable, '-c', 'from pyglossary.ui.main import main; main()',
                '--ui=none', '--no-progress-bar', '--no-color',
                str(work / 'dictionary.csv'), str(archive), '--read-format=Csv', '--write-format=Kobo')
            run(sys.executable, 'format/verify_kobo.py', str(work / 'dictionary.csv'), str(archive))
            os.replace(archive, work / version['filename'])
            stage.rmdir()
        except Exception:
            print(f'Build failed; staging files retained: {stage}', file=sys.stderr)
            raise
        summary = json.loads((work / 'summary.json').read_text(encoding='utf-8'))
        results.append((version, summary))
    # Publish only after every requested version has passed full validation.
    manifest = {'tools': tools, 'versions': []}
    for version, summary in results:
        source = Path(version['workDir']) / version['filename']
        destination = Path(version['destination'])
        destination.parent.mkdir(parents=True, exist_ok=True)
        pending = destination.with_suffix('.zip.pending')
        shutil.copyfile(source, pending)
        os.replace(pending, destination)
        manifest['versions'].append({
            'id': version['id'], 'label': version['label'], 'entries': summary['entries'],
            'file': destination.relative_to(ROOT).as_posix(), 'bytes': destination.stat().st_size,
            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'sources': summary['sources'],
            'validation': json.loads((Path(version['workDir']) / 'zip-validation.json').read_text(encoding='utf-8')),
        })
        print(f'Published: {destination}', flush=True)
    # A single-version invocation only reports that invocation, never stale versions.
    (ROOT / 'dictionary' / 'build-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('version', nargs='?', default='all',
                        choices=['all', 'traditional-bpmf', 'combined-bpmf', 'combined-pinyin'])
    build(parser.parse_args().version)

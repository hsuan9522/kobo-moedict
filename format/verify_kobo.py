"""核對 Kobo ZIP 的完整性、索引及 HTML 字頭。"""
import csv
import gzip
import json
from pathlib import Path
import re
import sys
import zipfile
import marisa_trie


def verify(csv_path, zip_path):
    with csv_path.open(encoding='utf-8', newline='') as source:
        rows = list(csv.reader(source))
    if any(len(row) != 2 for row in rows):
        raise ValueError('CSV 欄位數不正確')
    expected = dict(rows)
    if not expected or any(len(title) != 1 for title in expected):
        raise ValueError('字典必須只包含 Unicode 單字字頭')
    if len(expected) != len(rows):
        raise ValueError('CSV 含重複字頭')
    with zipfile.ZipFile(zip_path) as archive:
        if archive.testzip() is not None:
            raise ValueError('ZIP 完整性檢查失敗')
        index = marisa_trie.Trie().frombytes(archive.read('words'))
        if set(index.keys()) != set(expected):
            raise ValueError('Kobo 索引與 CSV 字頭不同')
        actual = []
        checked = set()
        for name in archive.namelist():
            if not name.endswith('.html'):
                continue
            html = gzip.decompress(archive.read(name)).decode('utf-8')
            for word in re.findall(r'<w>(.*?)</w>', html, re.S):
                anchor = re.search(r'<a name="([^"]+)"\s*/>', word)
                if not anchor:
                    raise ValueError(f'缺少字頭 anchor：{name}')
                title = anchor[1]
                actual.append(title)
                if title not in expected or title in checked:
                    raise ValueError(f'非預期或重複字頭：{title}')
                marker = word.find('<br/>')
                if marker < 0 or not word.endswith('</div>'):
                    raise ValueError(f'未知 Kobo 詞條格式：{title}')
                actual_body = word[marker + len('<br/>'):-len('</div>')]
                body = re.sub(r'(?:<br>)+$', '', expected[title])
                if actual_body != body:
                    raise ValueError(f'完整內容不符：{title}')
                checked.add(title)
        if len(actual) != len(expected) or set(actual) != set(expected):
            raise ValueError('HTML 詞條與 CSV 不一致')
        if checked != set(expected):
            raise ValueError('未完整驗證所有詞條')
    result = {'entries': len(expected), 'bytes': zip_path.stat().st_size,
              'checked_entries': len(checked), 'status': 'passed'}
    (csv_path.parent / 'zip-validation.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True))


if __name__ == '__main__':
    verify(Path(sys.argv[1]), Path(sys.argv[2]))

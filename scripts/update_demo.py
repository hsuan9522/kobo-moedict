"""Replace dictionary panel contents while preserving every other character of the demo."""
import json
from html.parser import HTMLParser
from pathlib import Path
import sys


class Panels(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=False)
        self.lines = [0]
        for index, char in enumerate(html):
            if char == '\n':
                self.lines.append(index + 1)
        self.title = None
        self.active = None
        self.depth = 0
        self.ranges = []
        self.feed(html)
        if self.active:
            raise ValueError('Unclosed dictionary panel')

    def position(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'section' and attrs.get('id', '').startswith('char-'):
            self.title = attrs['id'][len('char-'):]
        if tag != 'div':
            return
        if 'data-panel' in attrs:
            if self.active or not self.title:
                raise ValueError('Ambiguous dictionary panel')
            self.active = (self.title, attrs['data-panel'], self.position() + len(self.get_starttag_text()))
            self.depth = 1
        elif self.active:
            self.depth += 1

    def handle_endtag(self, tag):
        if tag == 'div' and self.active:
            self.depth -= 1
            if not self.depth:
                self.ranges.append((*self.active, self.position()))
                self.active = None


def update(filename, payload):
    before = filename.read_bytes().decode('utf-8')
    ranges = Panels(before).ranges
    expected = {(title, version) for version, entries in payload.items() for title in entries}
    actual_keys = {(title, version) for title, version, _, _ in ranges}
    if not ranges or not actual_keys.issubset(expected) or len(actual_keys) != len(ranges):
        raise ValueError('Demo panels do not match the supplied dictionary examples')
    pieces = []
    preserved = []
    cursor = 0
    newline = '\r\n' if '\r\n' in before else '\n'
    for title, version, start, end in ranges:
        unchanged = before[cursor:start]
        pieces.append(unchanged)
        preserved.append(unchanged)
        line_start = before.rfind('\n', 0, end) + 1
        closing_indent = before[line_start:end]
        if closing_indent.strip():
            closing_indent = '            '
        content_indent = closing_indent + '    '
        content = payload[version][title].strip().replace('\r\n', '\n')
        pieces.append(newline + newline.join(content_indent + line for line in content.split('\n'))
                      + newline + closing_indent)
        cursor = end
    pieces.append(before[cursor:])
    preserved.append(before[cursor:])
    after = ''.join(pieces)
    # Independently reparse the result and check that ALL non-panel bytes remain identical.
    actual = []
    cursor = 0
    for _, _, start, end in Panels(after).ranges:
        actual.append(after[cursor:start])
        cursor = end
    actual.append(after[cursor:])
    if actual != preserved:
        raise ValueError('Content update would modify user-edited text outside the dictionary panels')
    filename.write_bytes(after.encode('utf-8'))
    print(f'Updated {len(ranges)} dictionary panels; all other demo text preserved exactly')


if __name__ == '__main__':
    update(Path(sys.argv[1]), json.loads(sys.stdin.buffer.read().decode('utf-8')))

import hashlib
import argparse
import json
import xml.etree.ElementTree as E
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Extract MOE source reading numbers from the original XLSX')
parser.add_argument('xlsx', type=Path)
parser.add_argument('--output', type=Path, default=root / 'data')
args = parser.parse_args()
base = args.output
base.mkdir(parents=True, exist_ok=True)
filename = args.xlsx
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
orders = {}
with zipfile.ZipFile(filename) as archive:
    strings = [''.join(item.itertext()) for item in E.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    for _, row in E.iterparse(archive.open('xl/worksheets/sheet1.xml'), events=('end',)):
        if not row.tag.endswith('}row'):
            continue
        values = {}
        for cell in row.findall('s:c', ns):
            value = cell.find('s:v', ns)
            value = value.text if value is not None else ''
            key = ''.join(char for char in cell.attrib['r'] if char.isalpha())
            values[key] = strings[int(value)] if cell.attrib.get('t') == 's' and value else value
        if values.get('A') and values.get('H', '').isdigit() and values.get('I'):
            orders.setdefault(values['A'], []).append({
                'bopomofo': values['I'], 'pinyin': values.get('L', ''),
                'order': int(values['H']) or 1,
            })
        row.clear()
(base / 'reading-orders.json').write_text(json.dumps(orders, ensure_ascii=False), encoding='utf-8')
(base / 'reading-orders-source.json').write_text(json.dumps({
    'url': 'https://github.com/g0v/moedict-data/blob/main/dict_revised/dict_revised_1.xlsx',
    'sha256': hashlib.sha256(filename.read_bytes()).hexdigest(),
    'columns': {'title': 'A', 'order': 'H', 'bopomofo': 'I', 'pinyin': 'L'},
}, indent=2), encoding='utf-8')
print('Reading-order titles:', len(orders))

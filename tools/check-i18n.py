"""check-i18n.py — หาข้อความภาษาไทยที่ยังไม่มีคำแปลอังกฤษ

วิธีใช้: python tools/check-i18n.py [ไฟล์.html ...]   (ไม่ใส่ไฟล์ = ตรวจทุกหน้า)

นับว่าแปลแล้วเมื่อ
  - ข้อความอยู่ใน element ที่มี data-en (ตัวมันเองหรือบรรพบุรุษ)
  - แอตทริบิวต์ที่มองเห็น (aria-label, placeholder, alt, title) มี data-en-<ชื่อ> คู่กัน
ข้าม <script> <style> คอมเมนต์ และ <meta> (SEO เก็บเป็นภาษาไทย)
เตือนด้วยถ้ามี data-en ซ้อนกัน เพราะตัวนอกจะเขียนทับตัวใน
"""
import re
import sys
import glob
from html.parser import HTMLParser

THAI = re.compile(r'[฀-๿]')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
ATTRS = ('aria-label', 'placeholder', 'alt', 'title')


class Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []      # (tag, covered)
        self.skip = 0
        self.problems = []

    def covered(self):
        return any(c for _, c in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        has_en = 'data-en' in a
        if has_en and self.covered():
            self.problems.append((line, 'data-en ซ้อนกัน', tag))
        if tag != 'meta':
            for name in ATTRS:
                v = a.get(name)
                if v and THAI.search(v) and ('data-en-' + name) not in a and not self.covered():
                    self.problems.append((line, f'แอตทริบิวต์ {name}', v))
        if tag in ('script', 'style'):
            self.skip += 1
        if tag not in VOID:
            self.stack.append((tag, has_en))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
        # ปิดแท็กที่ค้างอยู่จนถึงตัวที่ตรงกัน
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self.skip or not THAI.search(data) or self.covered():
            return
        self.problems.append((self.getpos()[0], 'ข้อความ', ' '.join(data.split())[:80]))


def main():
    files = sys.argv[1:] or [f for f in glob.glob('**/*.html', recursive=True)
                             if not f.startswith(('map-details', 'node_modules', 'w3x', 'tools'))]
    total = 0
    for f in sorted(files):
        c = Checker()
        with open(f, encoding='utf-8') as fh:
            c.feed(fh.read())
        for line, kind, text in c.problems:
            print(f'{f}:{line}  [{kind}]  {text}')
        total += len(c.problems)
    print(f'\nยังไม่ได้แปล {total} จุด')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()

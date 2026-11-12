#!/usr/bin/env python3
"""Explore the structure of the uploaded lab-tests docx file."""
import docx, sys, json

path = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(path)

print("== paragraphs:", len(doc.paragraphs))
print("== tables:", len(doc.tables))
for ti, t in enumerate(doc.tables):
    print(f"table {ti}: rows={len(t.rows)} cols={len(t.columns)}")
    if len(t.rows):
        first = t.rows[0]
        print("  header cells:", [c.text.strip()[:20] for c in first.cells])

# total row data sample
t = doc.tables[0]
rows = t.rows
print("== sample row 1 (id col + lengths):")
r = rows[1]
for ci, c in enumerate(r.cells):
    txt = c.text.strip()
    print(f"  cell {ci}: len={len(txt)} | {txt[:80]!r}")

# list categories + ids
print("== all rows (id | bakhsh | title | onvan | txt_action | fav):")
for ri, r in enumerate(rows):
    if ri == 0:
        continue
    cells = [c.text.strip() for c in r.cells]
    if len(cells) >= 7:
        print(f"  {cells[0]} | {cells[1]} | {cells[2]} | {cells[3][:28]} | {cells[4][:18]} | {cells[6]}")

# check inline images / media
import zipfile
z = zipfile.ZipFile(path)
media = [n for n in z.namelist() if n.startswith("word/media/")]
print("== media files:", media)

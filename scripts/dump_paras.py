#!/usr/bin/env python3
"""Dump paragraph structure of the docx to understand layout."""
import docx

path = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(path)
print("paragraphs:", len(doc.paragraphs))
for i, p in enumerate(doc.paragraphs[:120]):
    style = p.style.name if p.style else ""
    txt = p.text.strip()
    if txt:
        print(f"[{i}] ({style}) {txt[:110]!r}")
    else:
        print(f"[{i}] <empty>")

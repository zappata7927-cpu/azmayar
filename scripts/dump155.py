#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dump raw paragraphs of record 155 (ALL leukemia) to see its structure."""
import docx

SRC = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(SRC)
lines = [p.text for p in doc.paragraphs]

start = None
for i, l in enumerate(lines):
    if l.strip().startswith("155,'18'"):
        start = i
        break
print("start para:", start)
end = None
for j in range(start + 1, len(lines)):
    if lines[j].strip().startswith("156,'18'"):
        end = j
        break
for i in range(start, end):
    t = lines[i].strip()
    if t:
        print(f"[{i}] {t[:130]!r}")

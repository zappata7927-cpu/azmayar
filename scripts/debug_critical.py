#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Debug: why critical sections are missing in some records."""
import docx, re

SRC = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(SRC)
lines = [p.text for p in doc.paragraphs]

# find all lines containing مقادیر بحرانی
n_colon_same = 0
n_colon_next = 0
samples = []
for i, l in enumerate(lines):
    s = l.strip()
    if "بحرانی" in s and "مقادیر" in s:
        if s.rstrip().endswith(":"):
            n_colon_same += 1
        else:
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
            nxt2 = lines[i + 2].strip() if i + 2 < len(lines) else ""
            n_colon_next += 1
            if len(samples) < 6:
                samples.append((i, s[:60], nxt[:30], nxt2[:30]))
print("colon same line:", n_colon_same, "| colon next line:", n_colon_next)
for s in samples:
    print("  ", s)

# count total occurrences
total = sum(1 for l in lines if "بحرانی" in l)
print("total lines containing بحرانی:", total)

# check record 1 area again (record 1 = paragraphs 1..?)
start = None
for i, l in enumerate(lines):
    if l.strip().startswith("2,'11'"):
        end = i
        break
# print last 25 non-empty paragraphs of record 1
tail = [l for l in lines[1:end] if l.strip()][-18:]
for t in tail:
    print(f"  {t[:100]!r}")

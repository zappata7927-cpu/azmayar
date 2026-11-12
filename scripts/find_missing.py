#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find record ids that failed to match REC_START and inspect raw lines."""
import docx, re

SRC = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(SRC)
lines = [p.text for p in doc.paragraphs]

REC_START = re.compile(r"^(\d+),'(\d+)','(.*?)','(.*?)','(.*?)','(.*)$")
found = set()
suspects = []
for i, line in enumerate(lines):
    s = line.strip()
    m = REC_START.match(s)
    if m:
        found.add(int(m.group(1)))
    else:
        # line starts with digits+comma but didn't match -> suspect
        if re.match(r"^\d+,\s*'", s):
            suspects.append((i, s[:200]))

all_ids = set(range(1, 570))
missing = sorted(all_ids - found)
print("found:", len(found), "missing ids:", missing)
for i, s in suspects:
    print("-" * 50)
    print(f"para {i}: {s!r}")
    for j in range(i + 1, min(i + 3, len(lines))):
        print(f"   next[{j}]: {lines[j][:150]!r}")

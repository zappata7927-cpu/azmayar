#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inspect raw record-start lines where the title column looks numeric."""
import docx, re

SRC = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(SRC)
lines = [p.text for p in doc.paragraphs]

REC_START = re.compile(r"^(\d+),'(\d+)','(.*?)','(.*?)','(.*?)','(.*)$")
starts = []
for i, line in enumerate(lines):
    m = REC_START.match(line.strip())
    if m:
        starts.append((i, m))

print("num starts:", len(starts))
shown = 0
for (i, m) in starts:
    title, onvan, action = m.group(3), m.group(4), m.group(5)
    if re.fullmatch(r"[\d\s]+", title):
        if shown < 8:
            shown += 1
            print("-" * 60)
            print(f"para {i}: id={m.group(1)} bakhsh={m.group(2)}")
            print(f"  title={title!r}")
            print(f"  onvan={onvan!r}")
            print(f"  action={action!r}")
            print(f"  rest={m.group(6)[:120]!r}")
            # also print the following 3 lines
            for j in range(i + 1, i + 4):
                print(f"    next[{j}]: {lines[j][:100]!r}")

# count how many have non-numeric title
bad = sum(1 for (i, m) in starts if re.fullmatch(r"[\d\s]+", m.group(3)))
print("numeric-title records:", bad, "/", len(starts))
# check onvan numeric?
bad2 = sum(1 for (i, m) in starts if re.fullmatch(r"[\d\s]+", m.group(4)))
print("numeric-onvan records:", bad2)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Print full ordered record list: id | cat | name | short, to understand category numbering."""
import docx, re

SRC = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
doc = docx.Document(SRC)
lines = [p.text for p in doc.paragraphs]

REC_START = re.compile(r"^(\d+),'(\d+)','(.*?)','(.*?)','(.*?)','(.*)$")
out = []
for line in lines:
    m = REC_START.match(line.strip())
    if m:
        out.append((int(m.group(1)), m.group(2), m.group(3), m.group(4), m.group(5)))

out.sort()
for rid, bakhsh, title, onvan, action in out:
    print(f"{rid:3d} | b={bakhsh:>3s} | t={title[:24]:24s} | {onvan[:40]:40s} | {action[:14]}")

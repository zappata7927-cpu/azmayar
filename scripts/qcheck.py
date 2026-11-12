#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quality check on freshly parsed tests.json."""
import json
from collections import Counter

OUT = "/home/z/my-project/scripts/out"
tests = json.load(open(f"{OUT}/tests.json", encoding="utf-8"))

def show(rid):
    t = next((x for x in tests if x["id"] == rid), None)
    if not t:
        print(f"record {rid}: NOT FOUND")
        return
    print(f"\n===== {t['id']}: {t['name']} | short={t['short']!r} | cat={t['cat']}")
    for s in t["sections"]:
        st = s["type"] + (f" [{s.get('title','')[:36]}]" if s.get("title") else "")
        if s.get("unit"):
            st += f" ({s['unit']})"
        detail = ""
        if s.get("rows"):
            detail = f"rows={len(s['rows'])} first={s['rows'][0]}"
        elif s.get("items"):
            detail = f"items={len(s['items'])} kinds={Counter(i['kind'] for i in s['items'])}"
        elif s.get("paras"):
            detail = f"paras={len(s['paras'])}"
        print(f"   {st} -> {detail}")

for rid in ["1", "5", "64", "155", "216", "237", "266", "304", "428", "470", "498", "510", "528", "539", "544", "464"]:
    show(rid)

# stats
no_short = sum(1 for t in tests if not t["short"])
print("\ntests without short:", no_short)
sec_types = Counter()
empty_tests = 0
for t in tests:
    if not t["sections"]:
        empty_tests += 1
    for s in t["sections"]:
        sec_types[s["type"]] += 1
print("empty tests:", empty_tests)
print("sections:", dict(sec_types))
# names sanity
weird = [t for t in tests if len(t["name"]) < 3 or t["name"] in ("اصول آزمایش", "روش کار")]
print("weird names:", [(t['id'], t['name'], t['cat']) for t in weird][:20])

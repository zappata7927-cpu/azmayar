#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Diagnostics: check spurious ids, 'other' section titles, critical/abnormal misses."""
import json, re
from collections import Counter

OUT = "/home/z/my-project/scripts/out"
tests = json.load(open(f"{OUT}/tests.json", encoding="utf-8"))
ids = [t["id"] for t in tests]
print("count:", len(ids), "unique:", len(set(ids)))
expected = set(range(1, 570)) - {423, 424, 570}
have = set(int(i) for i in ids)
print("missing ids:", sorted(expected - have))
print("extra ids:", sorted(have - expected))
dups = [i for i, c in Counter(ids).items() if c > 1]
print("duplicates:", dups)

# 'other' section titles frequency
titles = Counter()
for t in tests:
    for s in t["sections"]:
        if s["type"] == "other":
            titles[s.get("title", "?")] += 1
print("\ntop 'other' titles:")
for t, n in titles.most_common(40):
    print(f"  {n:4d}  {t}")

# check critical/abnormal for specific records
for rid in ["1", "4", "8", "11", "155", "206", "216", "337", "470", "465"]:
    t = next((x for x in tests if x["id"] == rid), None)
    if t:
        print(f"\n--- record {rid}: {t['name']} | short={t['short']!r} | cat={t['cat']}")
        for s in t["sections"]:
            kind = s["type"] + (f"({s.get('title','')[:30]})" if s.get("title") else "")
            detail = ""
            if s.get("rows"): detail = f" rows={len(s['rows'])} ex={s['rows'][0]}"
            elif s.get("items"): detail = f" items={len(s['items'])} ex={s['items'][0]['text'][:50]!r}"
            elif s.get("paras"): detail = f" paras={len(s['paras'])} ex={s['paras'][0][:60]!r}"
            print(f"   {kind}{detail}")

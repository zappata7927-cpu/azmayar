#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Leitner flashcards + quiz questions from the structured tests.json.
Outputs: scripts/out/cards.json, scripts/out/questions.json
"""
import json
import re
import random
import os

OUT = "/home/z/my-project/scripts/out"
tests = json.load(open(f"{OUT}/tests.json", encoding="utf-8"))
cats = json.load(open(f"{OUT}/categories.json", encoding="utf-8"))
random.seed(42)

FA = "fa"

def fa_ok(s):
    return bool(re.search(r"[\u0600-\u06FF]", s or ""))

def trim(s, n=260):
    s = (s or "").strip()
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"

# ---------------------------------------------------------------- helpers
def nums_of(v):
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", v or "")]

def nice(x):
    if x >= 100:
        return int(round(x / 5.0) * 5)
    if x >= 10:
        return int(round(x))
    return round(x, 1) if x != int(x) else int(x)

def perturb(value: str):
    """produce distractor variants for a numeric value string"""
    v = value.strip()
    ns = nums_of(v)
    out = []
    if re.search(r"\bتا\b", v) and len(ns) >= 2:
        a, b = ns[0], ns[1]
        span = max(b - a, 1)
        d1 = max(1, round(span * 0.15))
        d2 = max(1, round(span * 0.3))
        cands = [
            (nice(max(0, a - d1)), nice(b - d1)),
            (nice(a + d1), nice(b + d1)),
            (nice(max(0, a - d2)), nice(b + d2)),
        ]
        for x, y in cands:
            out.append(f"{x} تا {y}")
    elif "کمتر از" in v and ns:
        x = ns[-1]
        for f in (0.7, 1.4, 1.8):
            out.append(f"کمتر از {nice(x * f)}")
    elif "بیشتر از" in v and ns:
        x = ns[-1]
        for f in (0.7, 0.85, 1.3):
            out.append(f"بیشتر از {nice(x * f)}")
    elif len(ns) == 1:
        x = ns[0]
        for f in (0.6, 1.5, 2.0):
            out.append(str(nice(x * f)))
    return [str(d) for d in out if str(d).strip() != v.strip()]

def unit_suffix(sec):
    return f" ({sec['unit']})" if sec.get("unit") else ""

# ---------------------------------------------------------------- cards
cards = []
for t in tests:
    tid = t["id"]
    name = t["name"]
    cat = t["cat"]
    short = t["short"]
    sec_by = {}
    for s in t["sections"]:
        sec_by.setdefault(s["type"], []).append(s)
    t_cards = []

    def add(ftype, front, back):
        t_cards.append({"type": ftype, "front": trim(front, 220), "back": trim(back, 420)})

    if short and short.lower() != name.lower():
        full = ""
        fns = sec_by.get("full_name")
        if fns and fns[0].get("items"):
            full = fns[0]["items"][0]["text"]
        front = f"مخفف «{name}» چیست؟"
        back = short + (f" — {trim(full, 120)}" if full else "")
        add("abbr", front, back)

    for s in sec_by.get("normal", [])[:1]:
        unit = unit_suffix(s)
        rows = [r for r in s.get("rows", []) if nums_of(r["value"])]
        prefer = [r for r in rows if re.search(r"بالغ|مرد|زن|مذکر|مؤنث", r["group"])]
        picked = (prefer + [r for r in rows if r not in prefer])[:2]
        for r in picked:
            g = r["group"] or "بالغین"
            add("normal", f"مقدار طبیعی {name} در {g} چقدر است؟",
                f"{r['value']}{unit}")

    for s in sec_by.get("critical", [])[:1]:
        unit = unit_suffix(s)
        for r in s.get("rows", [])[:1]:
            g = f" در {r['group']}" if r["group"] else ""
            add("critical", f"مقدار بحرانی {name}{g} کدام است؟", f"{r['value']}{unit}")

    inc = sec_by.get("increase")
    if inc and inc[0].get("items"):
        items = [i["text"] for i in inc[0]["items"] if i.get("text")]
        if len(items) >= 3:
            add("increase", f"حداقل سه عامل افزایش‌دهنده {name} را نام ببرید.",
                " — ".join(items[:4]))

    dec = sec_by.get("decrease")
    if dec and dec[0].get("items"):
        items = [i["text"] for i in dec[0]["items"] if i.get("text")]
        if len(items) >= 3:
            add("decrease", f"حداقل سه عامل کاهش‌دهنده {name} را نام ببرید.",
                " — ".join(items[:4]))

    notes = sec_by.get("note")
    if notes and notes[0].get("paras"):
        add("note", f"نکته کلیدی درباره {name}؟", notes[0]["paras"][0])
    elif notes and notes[0].get("items"):
        txt = notes[0]["items"][0].get("text")
        if txt and fa_ok(txt):
            add("note", f"نکته کلیدی درباره {name}؟", txt)

    st = sec_by.get("storage")
    if st:
        txt = st[0].get("paras", [None])[0] if st[0].get("paras") else (
            st[0]["items"][0]["text"] if st[0].get("items") else None)
        if txt and fa_ok(txt):
            add("storage", f"نمونه {name} چگونه نگهداری می‌شود؟", txt)

    for i, c in enumerate(t_cards[:6]):
        cards.append({"id": f"{tid}c{i}", "tid": tid, "cat": cat, **c})

print("cards:", len(cards))
print("by type:", {k: sum(1 for c in cards if c['type'] == k) for k in set(c['type'] for c in cards)})

# ---------------------------------------------------------------- questions
questions = []
# pools for distractors
all_shorts = [{"v": t["short"], "name": t["name"]} for t in tests if t["short"]]
all_fulls = []
for t in tests:
    fns = [s for s in t["sections"] if s["type"] == "full_name"]
    if fns and fns[0].get("items"):
        txt = fns[0]["items"][0]["text"]
        if re.search(r"[A-Za-z]{4}", txt):
            all_fulls.append({"v": txt.strip(), "name": t["name"], "short": t["short"] or t["name"]})
normal_pool = []   # (test, cat, row) for value-based distractors
for t in tests:
    for s in t["sections"]:
        if s["type"] == "normal":
            for r in s.get("rows", []):
                if nums_of(r["value"]):
                    normal_pool.append({"v": r["value"], "unit": s.get("unit", ""), "cat": t["cat"]})

def uniq_options(correct, distractors):
    seen, opts = {correct.strip().lower()}, []
    for d in distractors:
        d = str(d).strip()
        if d and d.lower() not in seen and len(opts) < 3:
            seen.add(d.lower())
            opts.append(d)
    return opts

def mkq(qtype, tid, cat, text, correct, distractors, explanation):
    opts = uniq_options(correct, distractors)
    if len(opts) < 3:
        return None
    options = opts + [correct]
    rng = random.Random(f"{tid}{text}")
    rng.shuffle(options)
    return {
        "id": f"{tid}q{len(questions)}", "type": qtype, "tid": tid, "cat": cat,
        "q": trim(text, 240), "options": [trim(o, 160) for o in options],
        "answer": options.index(correct), "explanation": trim(explanation, 300),
    }

for t in tests:
    tid, name, cat, short = t["id"], t["name"], t["cat"], t["short"]
    sec_by = {}
    for s in t["sections"]:
        sec_by.setdefault(s["type"], []).append(s)
    t_qs = []

    # abbreviation
    if short and len(short) >= 2 and fa_ok(name):
        others = random.Random(tid + "s").sample(all_shorts, min(40, len(all_shorts)))
        ds = [o["v"] for o in others if o["v"].lower() != short.lower()]
        q = mkq("abbr", tid, cat, f"مخفف تست «{name}» کدام است؟", short, ds,
                f"مخفف {name}: {short}")
        if q:
            t_qs.append(q)

    # full name
    fns = sec_by.get("full_name")
    if fns and fns[0].get("items"):
        full = fns[0]["items"][0]["text"]
        if re.search(r"[A-Za-z]{4}", full):
            ds = random.Random(tid + "f").sample(all_fulls, min(40, len(all_fulls)))
            ds = [o["v"] for o in ds if o["v"].strip().lower() != full.strip().lower()]
            q = mkq("full", tid, cat,
                    f"نام کامل «{short or name}» کدام است؟", full.strip(), ds,
                    f"{short or name} = {full.strip()}")
            if q:
                t_qs.append(q)

    # normal values
    for s in sec_by.get("normal", [])[:1]:
        rows = [r for r in s.get("rows", []) if nums_of(r["value"]) and r["group"]]
        unit = unit_suffix(s)
        for r in rows[:2]:
            g = r["group"]
            ds = [perturb(r["value"])[0]] if perturb(r["value"]) else []
            pool = random.Random(tid + g).sample(normal_pool, min(30, len(normal_pool)))
            ds += [p["v"] for p in pool if p["v"].strip() != r["value"].strip()]
            q = mkq("normal", tid, cat,
                    f"مقدار طبیعی {name} در {g} کدام است؟",
                    f"{r['value']}{unit}", ds,
                    f"مقدار طبیعی {name} در {g}: {r['value']}{unit}")
            if q:
                t_qs.append(q)

    # critical
    for s in sec_by.get("critical", [])[:1]:
        rows = [r for r in s.get("rows", []) if nums_of(r["value"])]
        unit = unit_suffix(s)
        for r in rows[:1]:
            ds = perturb(r["value"]) or []
            pool = random.Random(tid + "cr").sample(normal_pool, min(30, len(normal_pool)))
            ds += [p["v"] for p in pool if p["v"].strip() != r["value"].strip()]
            g = f" در {r['group']}" if r["group"] else ""
            q = mkq("critical", tid, cat, f"مقدار بحرانی {name}{g} کدام است؟",
                    f"{r['value']}{unit}", ds,
                    f"مقدار بحرانی {name}{g}: {r['value']}{unit}")
            if q:
                t_qs.append(q)

    # increase / decrease attribution
    inc = sec_by.get("increase")
    dec = sec_by.get("decrease")
    inc_items = [i["text"] for s in (inc or []) for i in s.get("items", []) if i.get("text")]
    dec_items = [i["text"] for s in (dec or []) for i in s.get("items", []) if i.get("text")]
    rng_t = random.Random(tid + "incdec")
    if len(inc_items) >= 1 and len(dec_items) >= 3:
        correct = rng_t.choice(inc_items)
        ds = rng_t.sample([d for d in dec_items if d != correct], min(3, len(dec_items) - 1 if correct in dec_items else 3))
        ds = [d for d in ds if d != correct]
        if len(ds) == 3:
            q = mkq("increase", tid, cat, f"کدام مورد از عوامل افزایش‌دهنده {name} است؟",
                    correct, ds, f"«{correct}» باعث افزایش {name} می‌شود.")
            if q:
                t_qs.append(q)
    if len(dec_items) >= 1 and len(inc_items) >= 3:
        correct = rng_t.choice(dec_items)
        ds = rng_t.sample([d for d in inc_items if d != correct], min(3, len(inc_items) - 1 if correct in inc_items else 3))
        ds = [d for d in ds if d != correct]
        if len(ds) == 3:
            q = mkq("decrease", tid, cat, f"کدام مورد از عوامل کاهش‌دهنده {name} است؟",
                    correct, ds, f"«{correct}» باعث کاهش {name} می‌شود.")
            if q:
                t_qs.append(q)

    # cap per test
    questions.extend(t_qs[:5])

print("questions:", len(questions))
print("by type:", {k: sum(1 for q in questions if q['type'] == k) for k in set(q['type'] for q in questions)})
per_cat = {}
for q in questions:
    per_cat[q["cat"]] = per_cat.get(q["cat"], 0) + 1
print("cats with questions:", len(per_cat))
low = sorted(per_cat.items(), key=lambda x: x[1])[:8]
print("lowest:", low)

json.dump(cards, open(f"{OUT}/cards.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(questions, open(f"{OUT}/questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved cards.json & questions.json")

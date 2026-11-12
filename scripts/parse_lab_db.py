#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Final parser: flattened lab-tests docx -> structured JSON for the app.
Handles: split record-start lines, numeric category mapping, generic onvan
naming, strict header classification, artifact cleaning, sources record.
Outputs: scripts/out/tests.json, scripts/out/categories.json, scripts/out/sources.json
"""
import docx
import re
import json
import os
from collections import Counter, OrderedDict

SRC = "/home/z/my-project/upload/دیتابیس آزمایش‌های تشخیصی.docx"
OUT_DIR = "/home/z/my-project/scripts/out"
os.makedirs(OUT_DIR, exist_ok=True)

doc = docx.Document(SRC)
raw_lines = [p.text for p in doc.paragraphs]

# ---------------------------------------------------------------- helpers
ARABIC_MAP = {"ي": "ی", "ك": "ک", "ﻻ": "لا", "أ": "ا", "إ": "ا", "ؤ": "و", "ۀ": "ه"}
STRAY = [
    re.compile(r"\{[A-Za-z0-9_]{1,4}\}"),
    re.compile(r"<\\?'[^>\n]{0,24}'>"),
    re.compile(r"</?(strong|b|em|i|span|font)\b[^>]*>", re.I),
    re.compile(r"«[^»]{0,40}»"),
    re.compile(r"\]?[A-Za-z0-9_]{1,24}\.(?:png|jpg|jpeg|gif|bmp)\]?"),
]

def norm(s: str) -> str:
    for a, b in ARABIC_MAP.items():
        s = s.replace(a, b)
    s = s.replace("\xa0", " ").replace("\u200e", "").replace("\u200f", "")
    s = s.replace("\t", " ")
    s = re.sub(r" {2,}", " ", s)
    return s.strip()

def clean(s: str) -> str:
    s = norm(s)
    s = s.replace("\\,", ", ").replace("\\", "")
    for rx in STRAY:
        s = rx.sub("", s)
    s = re.sub(r"^\*\s*", "", s)
    s = re.sub(r"\s+([،؛.!؟])", r"\1", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()

def squashed(s: str) -> str:
    return re.sub(r"[\s\u200c]+", "", norm(s))

# ---------------------------------------------------------------- record split
REC_START = re.compile(r"^(\d+),'([^']*?)','([^']*?)','([^']*?)','([^']*?)','(.*)$", re.S)
records = []
cur = None
i = 0
n = len(raw_lines)
EXCLUDE_IDS = {"423", "424"}
sources_paras = []
while i < n:
    s = raw_lines[i].strip()
    m = REC_START.match(s)
    joined = False
    if not m and re.match(r"^\d+,\s*'", s) and not re.search(r"',?0\s*$", s):
        # try joining the next non-empty paragraph(s) to fix split metadata lines
        cand = s
        for j in range(i + 1, min(i + 3, n)):
            nxt = raw_lines[j].strip()
            if not nxt:
                continue
            cand2 = cand + nxt
            m2 = REC_START.match(cand2)
            if m2:
                m, joined, skip_until = m2, True, j
                break
    if m:
        rid = m.group(1)
        if cur is not None:
            records.append(cur)
            cur = None
        if joined:
            i = skip_until  # consume continuation paragraphs
        if rid == "570":
            # sources record (last one) -> keep raw paragraphs, not a test
            sources_paras = [m.group(6)] + raw_lines[i + 1:]
            i = n
            continue
        if rid in EXCLUDE_IDS:
            cur = None
            i += 1
            continue
        cur = {
            "id": rid, "bakhsh": m.group(2), "cat": m.group(3),
            "name": m.group(4), "short": m.group(5), "paras": [m.group(6)],
        }
        i += 1
        continue
    if cur is not None:
        cur["paras"].append(raw_lines[i])
    i += 1
if cur:
    records.append(cur)

# strip trailing fav terminator
for r in records:
    paras = r["paras"]
    idx = len(paras) - 1
    while idx >= 0 and not paras[idx].strip():
        idx -= 1
    if idx >= 0:
        last = paras[idx].rstrip()
        for suf in ("',0", "',1", ",0", ",1"):
            if last.endswith(suf):
                paras[idx] = last[: -len(suf)]
                r["fav"] = suf[-1]
                break

print("records:", len(records), "| sources paras:", len(sources_paras))

# ---------------------------------------------------------------- categories
_RENAME_SRC = {
    ("11", "تست های قند"): "تست‌های قند خون",
    ("11", "تست های چربی"): "تست‌های چربی خون",
    ("11", "تست های کليوی"): "تست‌های کلیوی",
    ("11", "تست های قلبی"): "مارکرهای قلبی",
    ("11", "تست های کبدی"): "تست‌های کبدی",
    ("11", "تست های پانکراس"): "تست‌های پانکراس",
    ("11", "تست های ويتامين"): "ویتامین‌ها",
    ("11", "تست های آهن"): "تست‌های آهن",
    ("11", "تست های املاح"): "الکترولیت‌ها و املاح",
    ("12", "تست های جنسی"): "هورمون‌های جنسی و بارداری",
    ("12", "تست های فوق کليه"): "تست‌های فوق کلیه",
    ("12", "تست های پاراتيروئيد"): "پاراتیروئید و کلسیم",
    ("12", "تست های هيپوفيز"): "هورمون‌های هیپوفیز",
    ("12", "تست های تيروئيد"): "تست‌های تیروئید",
    ("13", "بيوشيمی"): "بیوشیمی ادرار",
    ("13", "ماکروسکوپی"): "ماکروسکوپی ادرار",
    ("13", "ميکروسکوپی"): "میکروسکوپی ادرار",
    ("13", "نوار ادراری"): "نوار ادراری (دیک استیک)",
    ("13", "تست های تأييدی نوار ادراری"): "تست‌های تاییدی نوار ادراری",
    ("13", "نمونه های ادراری"): "نمونه‌های ادراری",
    ("14", "مايع مغزی - نخاعی"): "مایع مغزی-نخاعی (CSF)",
    ("14", "مايع آسيت"): "مایع آسیت",
    ("14", "مايع مفصلی"): "مایع مفصلی",
    ("14", "مايع پلور"): "مایع پلور",
    ("14", "مايع اسپرم"): "مایع اسپرم (سمن)",
    ("15", "مارکر"): "مارکرهای توموری",
    ("16", "ساير"): "سایر تست‌های بالینی",
    ("18", "1"): "لوسمی‌ها",
    ("19", "2"): "کم‌خونی‌ها",
    ("20", "3"): "سندرم‌های هماتولوژیک",
    ("21", "4"): "آزمایشات انعقادی",
    ("22", "پارامتر ها"): "پارامترهای CBC",
    ("22", "مورفولوژی گلبول های سفيد"): "مورفولوژی گلبول‌های سفید",
    ("22", "مورفولوژی گلبول های قرمز"): "مورفولوژی گلبول‌های قرمز",
    ("22", "مورفولوژی پلاکت ها"): "مورفولوژی پلاکت‌ها",
    ("22", "ساير موارد"): "سلول‌ها و اشکال خاص",
    ("23", "5"): "بانک خون",
    ("24", "6"): "آزمایشات هماتولوژی",
    ("26", "8"): "سرولوژی و ایمونولوژی",
    ("28", "10"): "استافیلوکوک و استرپتوکوک",
    ("29", "11"): "آزمایشات افتراقی باکتری‌ها",
    ("30", "12"): "نایسریا و موراکسلا",
    ("31", "13"): "اسمیر و کشت باکتری‌ها",
    ("32", "14"): "باکتری‌های اسپوردار و گرم‌مثبت",
    ("33", "15"): "انتروباکتریاسه و گرم‌منفی‌ها",
    ("34", "16"): "باکتری‌های خاص",
    ("35", "17"): "کشت‌های شایع",
    ("36", "18"): "آنتی‌بیوگرام",
    ("37", "19"): "محیط‌های کشت",
    ("38", "20"): "رنگ‌آمیزی‌های میکروبی",
    ("47", "29"): "کرم‌های پهن (ترماتودها)",
    ("48", "30"): "کرم‌های نواری (سستودها)",
    ("49", "31"): "کرم‌های گرد (نماتودها)",
    ("50", "32"): "تک‌یاخته‌ها (پروتوزوآ)",
    ("52", "34"): "قارچ‌ها",
    ("2", "سل کانتر"): "سل کانتر",
    ("3", "اتوآنالايزر"): "اتوآنالایزر",
    ("4", "P.C.R"): "PCR",
    ("5", "سانتريفيوژ"): "سانتریفیوژ",
    ("6", "الايزا"): "الایزا (ELISA)",
    ("7", "الايزا واشر"): "الایزا واشر",
    ("8", "الکتروفورز استات سلولز"): "الکتروفورز استات سلولز",
    ("9", "ميكروسكوپ"): "میکروسکوپ‌ها",
    ("10", "ميكروسکوپ"): "میکروسکوپ‌ها",
}
# normalize keys through clean() so Arabic chars never break the lookup
RENAME = {(_b, clean(_t)): _v for (_b, _t), _v in _RENAME_SRC.items()}
GROUP_OF_LIST = [
    ("سل کانتر", "هماتولوژی"), ("سلول‌ها", "هماتولوژی"),
    ("قلبی", "بیوشیمی خون"), ("مارکر", "مارکرها"),
    ("قند", "بیوشیمی خون"), ("چربی", "بیوشیمی خون"), ("کلیوی", "بیوشیمی خون"),
    ("کبدی", "بیوشیمی خون"), ("پانکراس", "بیوشیمی خون"), ("ویتامین", "بیوشیمی خون"),
    ("آهن", "بیوشیمی خون"), ("املاح", "بیوشیمی خون"), ("سایر تست", "بیوشیمی خون"),
    ("هورمون", "هورمون‌ها"), ("فوق کلیه", "هورمون‌ها"), ("پاراتیروئید", "هورمون‌ها"),
    ("هیپوفیز", "هورمون‌ها"), ("تیروئید", "هورمون‌ها"),
    ("ادرار", "ادرار و مایعات بدن"), ("مایع", "ادرار و مایعات بدن"),
    ("CBC", "هماتولوژی"), ("هماتولوژی", "هماتولوژی"), ("لوسمی", "هماتولوژی"),
    ("کم‌خونی", "هماتولوژی"), ("سندرم", "هماتولوژی"), ("انعقادی", "هماتولوژی"),
    ("بانک خون", "هماتولوژی"), ("مورفولوژی", "هماتولوژی"),
    ("سرولوژی", "سرولوژی و میکروب‌شناسی"), ("استافیلوکوک", "سرولوژی و میکروب‌شناسی"),
    ("افتراقی", "سرولوژی و میکروب‌شناسی"), ("نایسریا", "سرولوژی و میکروب‌شناسی"),
    ("اسمیر", "سرولوژی و میکروب‌شناسی"), ("اسپوردار", "سرولوژی و میکروب‌شناسی"),
    ("انتروباکتریاسه", "سرولوژی و میکروب‌شناسی"), ("باکتری‌های خاص", "سرولوژی و میکروب‌شناسی"),
    ("کشت", "سرولوژی و میکروب‌شناسی"), ("آنتی‌بیوگرام", "سرولوژی و میکروب‌شناسی"),
    ("محیط", "سرولوژی و میکروب‌شناسی"), ("رنگ‌آمیزی", "سرولوژی و میکروب‌شناسی"),
    ("کرم", "انگل‌شناسی"), ("تک‌یاخته", "انگل‌شناسی"),
    ("قارچ", "قارچ‌شناسی"),
]
INSTRUMENTS = {"سل کانتر", "اتوآنالایزر", "PCR", "سانتریفیوژ", "الایزا (ELISA)",
               "الایزا واشر", "الکتروفورز استات سلولز", "میکروسکوپ‌ها"}

def group_of(cat: str) -> str:
    if cat in INSTRUMENTS:
        return "تجهیزات و تکنیک‌ها"
    if cat == "کنترل کیفیت آزمایشگاه":
        return "کنترل کیفیت"
    for k, g in GROUP_OF_LIST:
        if k in cat:
            return g
    return "سایر"

GENERIC_SQUASH = set()
for t in [
    "اصول آزمایش", "روش انجام آزمایش", "روش اسلایدی (کیفی)", "روش لوله‌ای (کمی)",
    "روش کمی", "روش کیفی", "نکات لازم", "منابع خطا", "کنترل کیفی", "کنترل و نگهداری",
    "مراحل", "انواع", "کاربردها", "اجزا واکنش", "تکنیک", "روش کار", "طبقه بندی",
    "ساختمان", "ساختمان دستگاه", "اساس کار دستگاه", "انواع دستگاه", "کالیبراسیون",
    "استفاده بهینه از دستگاه", "کنترل کیفی دستگاه", "کالیبراسیون دستگاه",
    "هیستوگرام های دستگاه", "خطاهای شمارش دستگاه", "مراحل شستشو", "مراحل انجام آزمایش",
    "اسمیر مستقیم", "رنگ آمیزی اسپور",
]:
    GENERIC_SQUASH.add(squashed(t))

def short_clean(s: str) -> str:
    s = clean(s)
    if not re.fullmatch(r"[A-Za-z0-9 .\-/&(),%']{1,28}", s or ""):
        return ""
    return s.strip()

# ---------------------------------------------------------------- sections
STRONG_CHECKS = [
    ("abbr", lambda t: t.startswith("ناماختصاری")),
    ("full_name", lambda t: t.startswith("نامکامل")),
    ("aka", lambda t: t.startswith("نامدیگر")),
    ("physiology", lambda t: t.startswith("تشریح")),
    ("clinical", lambda t: t.startswith("کاربردبالینی") or t.startswith("کاربردهایبالینی")),
    ("sampling", lambda t: t.startswith("شرایطو") or t.startswith("شرایطنمونه")),
    ("storage", lambda t: t.startswith("شرایطنگهداری") or t.startswith("رفتاربانمونه")),
    ("interference", lambda t: t.startswith("عواملمداخله") or t.startswith("تداخلات") or t.startswith("تداخل")),
    ("drugs_up", lambda t: t.startswith("داروهای") or t.startswith("داروهاییکه") or t.startswith("داروههای") or t.startswith("داروهائیکه")),
    ("normal", lambda t: t.startswith("مقادیرطبیعی") or t.startswith("مقادیرنرمال")),
    ("critical", lambda t: t.startswith("مقادیربحرانی")),
    ("abnormal", lambda t: t.startswith("یافتههایغیرطبیعی")),
    ("note", lambda t: t.startswith("نکته")),
]
def classify_strong(text: str):
    s = squashed(text).rstrip(":：")
    t = s.rstrip(":：").replace("می‌", "می").replace("می‌یابد", "مییابد")
    if (s.startswith("داروهای") or s.startswith("داروهاییکه") or s.startswith("داروههای")
            or s.startswith("داروهائیکه")):
        return "drugs_down" if "کاهش" in s else "drugs_up"
    for stype, fn in STRONG_CHECKS:
        if fn(s):
            return stype
    if "افزایشمییابد" in t or "افزایشمييابد" in t:
        return "increase"
    if "کاهشمییابد" in t or "کاهشمييابد" in t:
        return "decrease"
    return None

def classify_header(text: str, strict: bool):
    s = clean(text)
    if not re.search(r"[:：]\s*$", s):
        return None
    sq = squashed(text)
    # sub-headers that should stay inside their section
    plain = s.rstrip(":：").strip()
    if squashed(plain) in {"قبل از تست", "حین انجام تست", "حینانجامتست", "بعد از تست"}:
        return None
    if re.match(r"^\.?\d*\s*\.?\s*علل", plain):
        return None
    stype = classify_strong(text)
    if stype:
        unit = ""
        if stype in ("normal", "critical"):
            m2 = re.search(r"بر\s*حسب\s*([^:：]*)", sq)
            if m2:
                unit = m2.group(1).strip() or ""
        return (stype, unit, None)
    if strict:
        return None
    if len(plain) <= 60:
        return ("other", None, plain)
    return None

NUM_ITEM = re.compile(r"^(\d{1,2})\s*[-.)ـ]\s*(.+)$")
IMG_TOKEN = re.compile(r"^\{([A-Za-z0-9_]+\.(?:png|jpg|jpeg|gif))\}$")

def parse_lines(paras):
    lines = []
    pending_bullet = False
    for raw in paras:
        t = raw.strip()
        if not t:
            continue
        m = IMG_TOKEN.match(t)
        if m:
            # no embedded media in the source docx -> dead reference, skip
            pending_bullet = False
            continue
        c = clean(t)
        if not c:
            continue
        if c in ("•", "●", "·", "-", "o"):
            pending_bullet = True
            continue
        if c.startswith("•") or c.startswith("●") or c.startswith("·"):
            lines.append({"kind": "bullet", "text": c.lstrip("•●·").strip()})
            pending_bullet = False
            continue
        nm = NUM_ITEM.match(c)
        if nm:
            # numbered lines that end with ':' act as subgroup titles
            if nm.group(2).rstrip().endswith(":"):
                lines.append({"kind": "text", "text": nm.group(1) + "- " + nm.group(2).strip()})
            else:
                lines.append({"kind": "num", "n": int(nm.group(1)), "text": nm.group(2).strip()})
            pending_bullet = False
            continue
        if pending_bullet:
            lines.append({"kind": "bullet", "text": c})
            pending_bullet = False
        else:
            lines.append({"kind": "text", "text": c})
    return lines

def build_section(stype, unit, title, lines):
    sec = {"type": stype}
    if unit:
        sec["unit"] = unit
    if title:
        sec["title"] = title
    if stype in ("normal", "critical", "abnormal"):
        rows, pending_group = [], None
        for ln in lines:
            if ln["kind"] == "image":
                continue
            t = ln["text"]
            if t.endswith(":") and not re.search(r"[:：]\s*\S", t):
                pending_group = t.rstrip(":：").strip()
                continue
            m = re.match(r"^(.{2,60}?)\s*[:：]\s*(.+)$", t)
            if m and (re.search(r"\d", m.group(2)) or re.search(r"کمتر از|بیشتر از|منفی|تعیین|تا", m.group(2))):
                rows.append({"group": m.group(1).strip(), "value": m.group(2).strip()})
            elif pending_group:
                rows.append({"group": pending_group, "value": t})
                pending_group = None
            else:
                rows.append({"group": "", "value": t})
        # drop artifact rows (no Persian letters and no digits)
        rows = [r for r in rows
                if (re.search(r"[\u0600-\u06FF]", r["value"]) or re.search(r"\d", r["value"]))]
        if rows:
            sec["rows"] = rows
        return sec
    if stype in ("abbr", "full_name", "aka", "increase", "decrease", "clinical",
                 "sampling", "interference", "drugs_up", "drugs_down"):
        items = []
        for ln in lines:
            if ln["kind"] == "image":
                items.append({"kind": "image", "text": ln["text"]})
                continue
            if ln["kind"] == "text" and ln["text"].endswith(":") and len(ln["text"]) < 50:
                items.append({"kind": "sub", "text": ln["text"].rstrip(":：").strip()})
                continue
            k = ln["kind"]
            items.append({"kind": k if k in ("bullet", "num") else "bullet",
                          **({"n": ln["n"]} if k == "num" else {}),
                          "text": ln["text"]})
        if items:
            sec["items"] = items
        return sec
    paras, items = [], []
    for ln in lines:
        if ln["kind"] == "image":
            items.append({"kind": "image", "text": ln["text"]})
        elif ln["kind"] == "text":
            paras.append(ln["text"])
        else:
            items.append({"kind": ln["kind"], **({"n": ln["n"]} if ln.get("n") else {}), "text": ln["text"]})
    if paras:
        sec["paras"] = paras
    if items:
        sec["items"] = items
    return sec

def parse_record_sections(paras):
    lines = parse_lines(paras)
    # merge header lines whose colon sits alone on the next paragraph
    merged = []
    k = 0
    while k < len(lines):
        ln = lines[k]
        if (ln["kind"] == "text" and not ln["text"].endswith(":")
                and k + 1 < len(lines) and lines[k + 1]["kind"] == "text"
                and lines[k + 1]["text"] in (":", ": ", " :", "：")):
            merged.append({"kind": "text", "text": ln["text"] + ":"})
            k += 2
        else:
            merged.append(ln)
            k += 1
    lines = merged
    sections, cur_hdr, cur_lines = [], None, []

    def flush():
        nonlocal cur_hdr, cur_lines
        if cur_hdr:
            sections.append(build_section(cur_hdr[0], cur_hdr[1], cur_hdr[2], cur_lines))
        elif cur_lines:
            sections.append(build_section("other", None, None, cur_lines))
        cur_hdr, cur_lines = None, []

    STRICT_TYPES = {"abbr", "full_name", "aka", "clinical", "sampling", "storage",
                    "interference", "drugs_up", "drugs_down", "normal", "critical",
                    "abnormal", "increase", "decrease"}
    for ln in lines:
        if ln["kind"] == "text":
            strict = cur_hdr is not None and cur_hdr[0] in STRICT_TYPES
            h = classify_header(ln["text"], strict)
            if h:
                flush()
                cur_hdr, cur_lines = h, []
                continue
        cur_lines.append(ln)
    flush()
    # drop empty sections
    out = []
    for s in sections:
        has_content = bool(s.get("rows")) or bool(s.get("items")) or bool(s.get("paras"))
        if has_content:
            out.append(s)
    return out

# ---------------------------------------------------------------- build tests
tests, cat_counts = [], Counter()
fixed_short = {"17": "LDH"}
for r in records:
    b, title = r["bakhsh"].strip(), clean(r["cat"])
    cat = RENAME.get((b, title))
    if b == "27":
        cat = "سرولوژی اختصاصی"
    if b in {"40", "41", "42", "43", "44", "45"}:
        cat = "کنترل کیفیت آزمایشگاه"
    if not cat:
        cat = clean(title) or "سایر"
    name = clean(r["name"])
    onv_sq = squashed(r["name"])
    fam = re.sub(r"^آزمايش\s*", "", clean(r["cat"])).strip() if b == "27" else None
    if b == "27" or (b in {"2","3","4","5","6","7","8","9","10"}):
        fam = fam or clean(r["cat"])
        if onv_sq in GENERIC_SQUASH or onv_sq == squashed(fam):
            name = fam if onv_sq == squashed(fam) else f"{fam} – {name}"
    short = fixed_short.get(r["id"], short_clean(r["short"]))
    sections = parse_record_sections(r["paras"])
    cat_counts[cat] += 1
    tests.append({"id": r["id"], "cat": cat, "name": name, "short": short, "sections": sections})

cat_order_keys = [
    "تست‌های قند خون", "تست‌های چربی خون", "تست‌های کلیوی", "مارکرهای قلبی",
    "تست‌های کبدی", "تست‌های پانکراس", "ویتامین‌ها", "تست‌های آهن",
    "الکترولیت‌ها و املاح", "سایر تست‌های بالینی",
    "هورمون‌های جنسی و بارداری", "تست‌های فوق کلیه", "پاراتیروئید و کلسیم",
    "هورمون‌های هیپوفیز", "تست‌های تیروئید",
    "مارکرهای توموری",
    "بیوشیمی ادرار", "ماکروسکوپی ادرار", "میکروسکوپی ادرار",
    "نوار ادراری (دیک استیک)", "تست‌های تاییدی نوار ادراری", "نمونه‌های ادراری",
    "مایع مغزی-نخاعی (CSF)", "مایع آسیت", "مایع مفصلی", "مایع پلور", "مایع اسپرم (سمن)",
    "پارامترهای CBC", "آزمایشات هماتولوژی", "لوسمی‌ها", "کم‌خونی‌ها",
    "سندرم‌های هماتولوژیک", "آزمایشات انعقادی", "بانک خون",
    "مورفولوژی گلبول‌های سفید", "مورفولوژی گلبول‌های قرمز", "مورفولوژی پلاکت‌ها",
    "سلول‌ها و اشکال خاص", "سل کانتر",
    "سرولوژی و ایمونولوژی", "سرولوژی اختصاصی",
    "استافیلوکوک و استرپتوکوک", "آزمایشات افتراقی باکتری‌ها", "نایسریا و موراکسلا",
    "اسمیر و کشت باکتری‌ها", "باکتری‌های اسپوردار و گرم‌مثبت",
    "انتروباکتریاسه و گرم‌منفی‌ها", "باکتری‌های خاص", "کشت‌های شایع",
    "آنتی‌بیوگرام", "محیط‌های کشت", "رنگ‌آمیزی‌های میکروبی",
    "کرم‌های پهن (ترماتودها)", "کرم‌های نواری (سستودها)", "کرم‌های گرد (نماتودها)",
    "تک‌یاخته‌ها (پروتوزوآ)", "قارچ‌ها",
    "سل کانترX", "اتوآنالایزر", "PCR", "سانتریفیوژ", "الایزا (ELISA)",
    "الایزا واشر", "الکتروفورز استات سلولز", "میکروسکوپ‌ها",
    "کنترل کیفیت آزمایشگاه",
]
order_map = {k: i for i, k in enumerate(cat_order_keys)}
def cat_sort_key(c):
    return order_map.get(c, 999)

categories = []
for c, cnt in cat_counts.items():
    categories.append({
        "name": c, "group": group_of(c), "count": cnt, "order": cat_sort_key(c),
    })
categories.sort(key=lambda x: (x["order"], -x["count"]))
for i, c in enumerate(categories):
    c["order"] = i
    c.pop("order", None) if False else None
for i, c in enumerate(categories):
    c["order"] = i

print("\ncategories (%d):" % len(categories))
for c in categories:
    print(f"  [{c['order']:2d}] {c['group']} | {c['name']} ({c['count']})")

# ---------------------------------------------------------------- sources
refs = []
for p in sources_paras:
    c = clean(p)
    if not c or c in ("*",):
        continue
    c = c.lstrip("*").strip()
    if c:
        refs.append(c)
print("\nsources:", len(refs))
for r in refs[:10]:
    print("  -", r[:90])

# ---------------------------------------------------------------- save
with open(f"{OUT_DIR}/tests.json", "w", encoding="utf-8") as f:
    json.dump(tests, f, ensure_ascii=False, indent=1)
with open(f"{OUT_DIR}/categories.json", "w", encoding="utf-8") as f:
    json.dump(categories, f, ensure_ascii=False, indent=1)
with open(f"{OUT_DIR}/sources.json", "w", encoding="utf-8") as f:
    json.dump(refs, f, ensure_ascii=False, indent=1)

sec_counter = Counter()
for t in tests:
    for s in t["sections"]:
        sec_counter[s["type"]] += 1
print("\nsection types:", dict(sec_counter))
print("total tests:", len(tests))
import subprocess
print("tests.json size:", os.path.getsize(f"{OUT_DIR}/tests.json"), "bytes")

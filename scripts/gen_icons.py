#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate PWA icons: teal gradient rounded square + white erlenmeyer flask with liquid."""
from PIL import Image, ImageDraw
import os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

TEAL_DARK = (13, 104, 96)
TEAL = (16, 145, 132)
TEAL_LIGHT = (45, 190, 172)
ROSE = (244, 114, 182)


def rounded_gradient(size, radius_ratio=0.22):
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(s * radius_ratio)
    # vertical gradient teal
    grad = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / s
        col = (
            int(TEAL_DARK[0] + (TEAL_LIGHT[0] - TEAL_DARK[0]) * t),
            int(TEAL_DARK[1] + (TEAL_LIGHT[1] - TEAL_DARK[1]) * t),
            int(TEAL_DARK[2] + (TEAL_LIGHT[2] - TEAL_DARK[2]) * t),
            255,
        )
        gd.line([(0, y), (s, y)], fill=col)
    mask = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, s, s], radius=r, fill=255)
    img.paste(grad, (0, 0), mask)
    return img, d


def draw_flask(img, s):
    d = ImageDraw.Draw(img)
    cx = s * 0.5
    lw = max(3, int(s * 0.045))
    # flask neck (top) width
    neck_w = s * 0.16
    body_top = s * 0.38
    body_bot = s * 0.80
    body_half = s * 0.26
    neck_top = s * 0.22

    white = (255, 255, 255, 255)
    # neck lines
    d.line([(cx - neck_w / 2, neck_top), (cx - neck_w / 2, body_top + s * 0.06)], fill=white, width=lw)
    d.line([(cx + neck_w / 2, neck_top), (cx + neck_w / 2, body_top + s * 0.06)], fill=white, width=lw)
    # body: triangle-ish flask
    d.line([(cx - neck_w / 2, body_top + s * 0.06), (cx - body_half, body_bot)], fill=white, width=lw)
    d.line([(cx + neck_w / 2, body_top + s * 0.06), (cx + body_half, body_bot)], fill=white, width=lw)
    d.line([(cx - body_half, body_bot), (cx + body_half, body_bot)], fill=white, width=lw)
    # rim
    d.line([(cx - neck_w / 2 - s * 0.035, neck_top), (cx + neck_w / 2 + s * 0.035, neck_top)], fill=white, width=lw)

    # liquid (rose) inside body
    ly1 = s * 0.60
    ly2 = body_bot - lw / 2 - 1
    # liquid polygon between two slanted walls
    def xat(y):
        t = (y - (body_top + s * 0.06)) / (body_bot - (body_top + s * 0.06))
        return neck_w / 2 + (body_half - neck_w / 2) * t
    lx1a = cx - xat(ly1)
    lx1b = cx + xat(ly1)
    liquid = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(liquid)
    ld.polygon([(lx1a, ly1), (lx1b, ly1), (cx + body_half - lw, ly2), (cx - body_half + lw, ly2)], fill=ROSE + (235,))
    # clip liquid inside flask walls via mask
    mask = Image.new("L", img.size, 0)
    md2 = ImageDraw.Draw(mask)
    pad = lw * 0.75
    md2.polygon([
        (cx - xat(body_top + s * 0.06) - pad, body_top + s * 0.06),
        (cx + xat(body_top + s * 0.06) + pad, body_top + s * 0.06),
        (cx + body_half + pad, body_bot + pad),
        (cx - body_half - pad, body_bot + pad),
    ], fill=255)
    img.paste(liquid, (0, 0), Image.composite(mask, Image.new("L", img.size, 0), liquid.split()[3]))
    # bubbles
    for bx, by, br in [(cx - s * 0.10, s * 0.70, s * 0.028), (cx + s * 0.08, s * 0.66, s * 0.02), (cx + s * 0.02, s * 0.74, s * 0.016)]:
        d.ellipse([bx - br, by - br, bx + br, by + br], fill=(255, 255, 255, 210))
    return img


def gen(size, name, maskable=False):
    img, _ = rounded_gradient(size, 0.24 if not maskable else 0.0)
    if maskable:
        # full-bleed square with centered smaller glyph
        img2 = Image.new("RGBA", (size, size))
        gd = ImageDraw.Draw(img2)
        for y in range(size):
            t = y / size
            col = (
                int(TEAL_DARK[0] + (TEAL_LIGHT[0] - TEAL_DARK[0]) * t),
                int(TEAL_DARK[1] + (TEAL_LIGHT[1] - TEAL_DARK[1]) * t),
                int(TEAL_DARK[2] + (TEAL_LIGHT[2] - TEAL_DARK[2]) * t),
                255,
            )
            gd.line([(0, y), (size, y)], fill=col)
        img2 = draw_flask(img2, size * 0.78)
        # center paste
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        inner = img2.resize((size, size))
        canvas.paste(inner, (0, 0))
        canvas.save(f"{OUT}/{name}")
        return
    img = draw_flask(img, size * 0.80)
    img.save(f"{OUT}/{name}")


gen(192, "icon-192.png")
gen(512, "icon-512.png")
gen(512, "maskable-512.png", maskable=True)
gen(180, "apple-touch-icon.png")
# favicon 64
gen(64, "favicon-64.png")

# check non-blank
for f in ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "favicon-64.png"]:
    p = f"{OUT}/{f}"
    im = Image.open(p).convert("RGB")
    px = list(im.getdata())
    non_bg = sum(1 for c in px if abs(c[0] - 255) > 25 or abs(c[1] - 255) > 25)
    print(f, im.size, "non-white px:", f"{non_bg / len(px):.0%}")

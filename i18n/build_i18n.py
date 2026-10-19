#!/usr/bin/env python3
"""Rebuild public/i18n.js from i18n/*.json.

The bundle format (2-space indent, insertion order, compact separators) is
byte-identical to the checked-in file when the sources are unchanged.
Run after editing any i18n/*.json, then bump ?v= on i18n.js in index.html.
"""
import json
import os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["en", "es", "fr", "pt", "zh", "hi", "ar", "bn", "ru", "ur"]

src = open(os.path.join(HERE, "public", "i18n.js"), encoding="utf-8").read()
head = src[: src.index("window.FLOGLO_I18N = {};")]

parts = [head + "window.FLOGLO_I18N = {};"]
for lang in ORDER:
    with open(os.path.join(HERE, "i18n", f"{lang}.json"), encoding="utf-8") as f:
        data = json.load(f)
    parts.append(
        '  window.FLOGLO_I18N["%s"] = %s;'
        % (lang, json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    )
out = "\n".join(parts) + "\n})();\n"

with open(os.path.join(HERE, "public", "i18n.js"), "w", encoding="utf-8") as f:
    f.write(out)
print("rebuilt public/i18n.js")

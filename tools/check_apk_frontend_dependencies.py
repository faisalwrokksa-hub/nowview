#!/usr/bin/env python3
"""Static frontend integrity tests against owner-supplied APK.

The browser UI and Android hardware cannot be certified by static checks.
This script does not extract files or change the repository.
"""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import sys
import zipfile

class Dependencies(HTMLParser):
    def __init__(self):
        super().__init__()
        self.required = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "script" and d.get("src"):
            self.required.append(d["src"])
        if tag == "link" and d.get("rel") == "stylesheet" and d.get("href"):
            self.required.append(d["href"])

def check(path):
    with zipfile.ZipFile(path) as z:
        files = set(z.namelist())
        html = z.read("assets/index.html").decode("utf-8-sig")
        found = Dependencies()
        found.feed(html)
        required = [v.split("?")[0].lstrip("./") for v in found.required
                    if not v.startswith(("https:", "http:", "//", "data:"))]
        missing = [v for v in required if "assets/" + v not in files]
        print(f"Local frontend dependencies: {len(required)}, missing: {len(missing)}")
        for item in missing:
            print("MISSING:", item)
        return not missing

def main():
    p = argparse.ArgumentParser()
    p.add_argument("apk", type=Path)
    args = p.parse_args()
    if not args.apk.is_file():
        print("APK not found", file=sys.stderr)
        return 2
    try:
        return 0 if check(args.apk) else 1
    except (OSError, zipfile.BadZipFile, KeyError, UnicodeError) as exc:
        print(f"Validation error: {exc}", file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Audit APK frontend dependency wiring and compare packaged files to web/.

Read-only. A GitHub checkout can run it with an owner-provided APK without
checking the binary into version control or disclosing the installed app.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import zipfile

class ScriptReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.styles = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "script" and data.get("src"):
            self.scripts.append(data["src"])
        if tag == "link" and data.get("rel") == "stylesheet" and data.get("href"):
            self.styles.append(data["href"])

def audit(apk, web):
    with zipfile.ZipFile(apk) as z:
        assets = {n[7:]: z.read(n) for n in z.namelist()
                  if n.startswith("assets/") and "/" not in n[7:]}
    parser = ScriptReferences()
    parser.feed(assets["index.html"].decode("utf-8-sig"))
    required = []
    for src in parser.scripts + parser.styles:
        if src.startswith(("http:", "https:", "//", "data:")):
            continue
        required.append(src.split("?", 1)[0].lstrip("./"))
    unresolved = sorted({name for name in required if name not in assets})
    comparison = {}
    for name in sorted(assets):
        source = web / name
        if not source.is_file():
            result = "missing"
        elif source.read_bytes() == assets[name]:
            result = "exact"
        else:
            result = "different"
        comparison[name] = {
            "status": result,
            "apk_sha256": hashlib.sha256(assets[name]).hexdigest(),
            "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest()
                if source.is_file() else None,
        }
    return {"required_local_dependencies": sorted(set(required)),
            "unresolved_in_apk": unresolved, "files": comparison}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("apk", type=Path)
    p.add_argument("--web-dir", type=Path, default=Path(__file__).resolve().parents[1] / "web")
    a = p.parse_args()
    try:
        result = audit(a.apk, a.web_dir)
    except (OSError, zipfile.BadZipFile, KeyError, UnicodeError) as e:
        print(f"Audit failed: {e}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return int(bool(result["unresolved_in_apk"]) or
               any(x["status"] != "exact" for x in result["files"].values()))

if __name__ == "__main__":
    raise SystemExit(main())

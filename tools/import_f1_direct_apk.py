#!/usr/bin/env python3
"""Recover seven byte-verified frontend assets directly from the owner's APK.

By default this is a dry run; --apply creates files only when absent.
Never overwrites tracked web files or touches the Android package or keystore.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

EXPECTED = {
    "home.css": "f872c3d093bf90dc0e8cd75d17169794be553f8d1989e30c8727ac971289a1cf",
    "home.js": "bba726f861d15ebb2b7b0e5ca7f6145b63f28cc439a6f8bd53eb0420953e95b7",
    "refined.css": "3c3c327df23319079de8562a2affbebdb8f09429071ca5e141fcaf63c1549e58",
    "rss.js": "4b2577ac7d5c136f6e5197771529477f3f8562342dee87c2532b3fc5b37416d7",
    "tiger.png": "9d887c9c6ef16006266bae6dd4250405689777db4d26c835471be80307705327",
    "topics.js": "37179012e5a237e42e06120e9dddea80e9dda18fbd360d69026f4de989bcfe9c",
    "watch.js": "137e531858badb3c3f7ddd6dfcdebea39b03d9a3cfd702278fbbceb27edee763",
}

def import_from_apk(apk, web, apply=False):
    report = {"mode": "apply" if apply else "dry_run", "files": [], "errors": []}
    with zipfile.ZipFile(apk) as archive:
        for filename, checksum in EXPECTED.items():
            try:
                data = archive.read("assets/" + filename)
            except KeyError:
                report["errors"].append("Missing APK asset: " + filename)
                continue
            if hashlib.sha256(data).hexdigest() != checksum:
                report["errors"].append("Checksum mismatch: " + filename)
                continue
            destination = web / filename
            if destination.is_symlink():
                report["errors"].append("Refusing symlink: " + filename)
                continue
            if destination.exists():
                same = destination.is_file() and destination.read_bytes() == data
                status = "MATCHED" if same else "CONFLICT_NO_OVERWRITE"
                if not same:
                    report["errors"].append("Existing file differs: " + filename)
            elif apply:
                try:
                    with destination.open("xb") as handle:
                        handle.write(data)
                    status = "ADDED"
                except FileExistsError:
                    report["errors"].append("Concurrent file creation: " + filename)
                    continue
            else:
                status = "WOULD_ADD"
            report["files"].append({"name": filename, "status": status})
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path, help="NewView-Home-1.0.260-signed.apk")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--web-dir", type=Path, default=Path(__file__).resolve().parents[1] / "web")
    options = parser.parse_args()
    if not options.web_dir.is_dir() or not options.apk.is_file():
        print("APK and web directory must already exist.", file=sys.stderr)
        return 2
    try:
        report = import_from_apk(options.apk, options.web_dir, options.apply)
    except (OSError, zipfile.BadZipFile) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2))
    return int(bool(report["errors"]))

if __name__ == "__main__":
    raise SystemExit(main())

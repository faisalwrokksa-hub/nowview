#!/usr/bin/env python3
"""Import only missing, verified APK assets from owner-supplied alignment ZIP.

Dry-run by default. --apply adds new files only, never overwrites existing web/
files, never changes Android application identity or signing. Requires no pip deps.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

EXPECTED = {
    "home.css": ("f872c3d093bf90dc0e8cd75d17169794be553f8d1989e30c8727ac971289a1cf", 7955),
    "home.js": ("bba726f861d15ebb2b7b0e5ca7f6145b63f28cc439a6f8bd53eb0420953e95b7", 16605),
    "refined.css": ("3c3c327df23319079de8562a2affbebdb8f09429071ca5e141fcaf63c1549e58", 11889),
    "rss.js": ("4b2577ac7d5c136f6e5197771529477f3f8562342dee87c2532b3fc5b37416d7", 6532),
    "tiger.png": ("9d887c9c6ef16006266bae6dd4250405689777db4d26c835471be80307705327", 2022027),
    "topics.js": ("37179012e5a237e42e06120e9dddea80e9dda18fbd360d69026f4de989bcfe9c", 3803),
    "watch.js": ("137e531858badb3c3f7ddd6dfcdebea39b03d9a3cfd702278fbbceb27edee763", 1575),
}

def import_assets(archive_path, web_dir, apply=False):
    result = {"dry_run": not apply, "assets": [], "errors": []}
    if not web_dir.is_dir():
        raise FileNotFoundError(f"web directory missing: {web_dir}")
    with zipfile.ZipFile(archive_path) as archive:
        for name, (expected_hash, expected_size) in EXPECTED.items():
            entry = "web/" + name
            try:
                contents = archive.read(entry)
            except KeyError:
                result["errors"].append(f"Missing source: {entry}")
                continue
            actual_hash = hashlib.sha256(contents).hexdigest()
            if len(contents) != expected_size or actual_hash != expected_hash:
                result["errors"].append(f"Reference asset checksum mismatch: {entry}")
                continue
            target = web_dir / name
            if target.is_symlink():
                result["errors"].append(f"Refusing symlink: {target}")
                continue
            if target.exists():
                state = "ALREADY_MATCHES" if target.read_bytes() == contents else "CONFLICT_NO_OVERWRITE"
                if state.startswith("CONFLICT"):
                    result["errors"].append(f"Existing file differs: {target}")
                result["assets"].append({"name": name, "status": state})
                continue
            if apply:
                try:
                    with target.open("xb") as handle:
                        handle.write(contents)
                except FileExistsError:
                    result["errors"].append(f"Race: file now exists: {target}")
                    continue
            result["assets"].append({"name": name, "status": "ADDED" if apply else "WOULD_ADD"})
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="NewView_F1_Source_Alignment_Review.zip")
    parser.add_argument("--web-dir", type=Path, default=Path(__file__).resolve().parents[1] / "web")
    parser.add_argument("--apply", action="store_true", help="Explicitly create absent files")
    args = parser.parse_args()
    try:
        report = import_assets(args.archive, args.web_dir, args.apply)
    except (OSError, zipfile.BadZipFile) as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2))
    return int(bool(report["errors"]))

if __name__ == "__main__":
    raise SystemExit(main())

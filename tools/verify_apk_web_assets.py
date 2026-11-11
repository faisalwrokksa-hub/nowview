#!/usr/bin/env python3
"""Compare packaged Android assets against tracked web sources.

Usage:
  python3 tools/verify_apk_web_assets.py path/to/NewView-Home-1.0.260-signed.apk

Run from the repository root. No network access, extraction, mutation or
third-party packages are required. Exit 1 means assets are not aligned.
"""
import hashlib
import json
import pathlib
import sys
import zipfile


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def audit(apk_path, web_dir):
    with zipfile.ZipFile(apk_path) as archive:
        packaged = {
            info.filename.removeprefix("assets/"): archive.read(info)
            for info in archive.infolist()
            if info.filename.startswith("assets/")
            and not info.is_dir()
            and "/" not in info.filename.removeprefix("assets/")
            and "\\" not in info.filename.removeprefix("assets/")
        }

    tracked = {p.name: p.read_bytes() for p in web_dir.iterdir() if p.is_file()}
    rows = []
    for name in sorted(set(packaged) | set(tracked)):
        apk_data, git_data = packaged.get(name), tracked.get(name)
        status = (
            "MISSING_IN_GIT" if git_data is None else
            "NOT_IN_APK" if apk_data is None else
            "EXACT" if git_data == apk_data else "DIFFERENT"
        )
        rows.append({
            "file": name,
            "status": status,
            "apk_sha256": sha256(apk_data) if apk_data is not None else None,
            "git_sha256": sha256(git_data) if git_data is not None else None,
        })
    return rows


def main():
    if len(sys.argv) != 2:
        print("Usage: verify_apk_web_assets.py /path/to/reference.apk", file=sys.stderr)
        return 2
    apk_path = pathlib.Path(sys.argv[1])
    web_dir = pathlib.Path(__file__).resolve().parents[1] / "web"
    if not apk_path.is_file() or not web_dir.is_dir():
        print("APK or repository web/ directory not found.", file=sys.stderr)
        return 2
    try:
        rows = audit(apk_path, web_dir)
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f"Audit failed: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({"assets": rows}, indent=2))
    # A deliberate repo-only module (e.g. tv-home.js) does not prove breakage.
    return int(any(row["status"] in ("DIFFERENT", "MISSING_IN_GIT") for row in rows))


if __name__ == "__main__":
    raise SystemExit(main())

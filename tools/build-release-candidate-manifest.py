#!/usr/bin/env python3
"""Build an unapproved candidate-identity worksheet from actual signed APK bytes.

This NEVER signs, deploys, validates private legal evidence, or approves a release.
Only run on an authorized owner machine or the manually approved signing workflow.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

SHA40 = re.compile(r"^[0-9a-f]{40}$", re.I)
SHA64 = re.compile(r"^[0-9a-f]{64}$", re.I)

def verified_sdk_tool(tool):
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if not sdk:
        raise ValueError("ANDROID_HOME or ANDROID_SDK_ROOT is required")
    candidates = [Path(sdk) / "build-tools" / version / tool
                  for version in ("35.0.0", "34.0.0")]
    if os.name == "nt":
        candidates = [Path(str(path) + suffix) for path in candidates
                      for suffix in (".bat", ".exe")]
    for path in candidates:
        if path.is_file():
            return str(path)
    raise ValueError("Android SDK build-tool not installed: " + tool)

def run_checked(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
    if result.returncode:
        raise ValueError("Android SDK verification failed: " + Path(cmd[0]).name)
    return result.stdout

def inspect_apk(path, expected_package):
    if not path.is_file() or not path.stat().st_size or path.suffix.lower() != ".apk":
        raise ValueError("Expected a nonempty signed APK")
    aapt = verified_sdk_tool("aapt")
    apksigner = verified_sdk_tool("apksigner")
    # Verify Android signatures before extracting the signer fingerprint.
    signed = run_checked([apksigner, "verify", "--verbose", "--print-certs", str(path)])
    found = re.search(r"(?im)^Signer #1 certificate SHA-256 digest:\s*([0-9a-f:]+)\s*$", signed)
    if not found:
        raise ValueError("APK signer certificate fingerprint is unavailable")
    signer = found.group(1).replace(":", "").lower()
    if not SHA64.fullmatch(signer):
        raise ValueError("Invalid signer SHA256")
    manifest = run_checked([aapt, "dump", "badging", str(path)])
    found = re.search(
        r"(?m)^package: name='([^']+)' versionCode='([0-9]+)' versionName='([^']*)'",
        manifest
    )
    if not found or found.group(1) != expected_package:
        raise ValueError("Unexpected Android application ID")
    version_code = int(found.group(2))
    if version_code < 1:
        raise ValueError("Android release must use a positive versionCode")
    with path.open("rb") as file:
        digest = hashlib.file_digest(file, "sha256").hexdigest()
    return {
        "apkSha256": digest,
        "signerSha256": signer,
        "versionCode": version_code,
        "versionName": found.group(3),
    }

def create(tv, phone, source_sha):
    if not SHA40.fullmatch(source_sha or ""):
        raise ValueError("A full source Git SHA is required; never guess the revision")
    tv_info = inspect_apk(tv, "app.newview.dashboard")
    phone_info = inspect_apk(phone, "app.newview.phonecaster")
    return {
        "sourceCommit": source_sha,
        "tvApkSha256": tv_info["apkSha256"],
        "phoneApkSha256": phone_info["apkSha256"],
        "tvSignerSha256": tv_info["signerSha256"],
        "phoneSignerSha256": phone_info["signerSha256"],
        "versionCode": tv_info["versionCode"],
        "phoneVersionCode": phone_info["versionCode"],
        "previousVersionCode": None,  # Owner must establish upgrade/first-release status
        "versionName": tv_info["versionName"],
        "distributionChannel": "",
        "privacyPolicyUrl": "",
        "supportUrl": "",
        "approvalEvidenceUrl": "",
        "approvedBy": "",
        "approvedAt": ""
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tv", required=True, type=Path)
    parser.add_argument("--phone", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--source-sha", default=os.environ.get("GITHUB_SHA", ""))
    args = parser.parse_args()
    try:
        info = create(args.tv, args.phone, args.source_sha)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Owner fields intentionally blank; refuse overwriting any reviewed manifest.
        fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump({"candidate": info}, file, indent=2)
            file.write("\n")
        print("Created UNAPPROVED candidate identity manifest:", args.output)
        print("No licensing, store approval, physical QA or release authorization was granted.")
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        print("Release identity extraction FAILED:", error, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

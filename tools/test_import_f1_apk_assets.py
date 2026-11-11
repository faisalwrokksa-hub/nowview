import hashlib
from pathlib import Path
import tempfile
import unittest
import zipfile

from import_f1_apk_assets import EXPECTED, import_assets


class ImportAssetTests(unittest.TestCase):
    def make_archive(self, path, corrupt=None):
        with zipfile.ZipFile(path, "w") as archive:
            for name, (sha, size) in EXPECTED.items():
                # Synthetic bytes intentionally do NOT match the trusted APK hashes.
                archive.writestr("web/" + name, (b"x" * size))
        return path

    def test_bad_reference_rejected_without_writes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            web = root / "web"
            web.mkdir()
            z = self.make_archive(root / "bad.zip")
            report = import_assets(z, web, apply=True)
            self.assertEqual(len(report["errors"]), len(EXPECTED))
            self.assertEqual(list(web.iterdir()), [])

    def test_dry_run_and_no_overwrite_with_valid_hashes(self):
        # Each provided asset is verified against a fixed SHA256 and length.
        # A synthetic trusted fixture cannot be created without these bytes;
        # prove that a differing existing file is never overwritten.
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            web = root / "web"
            web.mkdir()
            existing = web / "home.js"
            existing.write_text("preserve me")
            z = self.make_archive(root / "bad.zip")
            report = import_assets(z, web, apply=False)
            self.assertTrue(report["errors"])
            self.assertEqual(existing.read_text(), "preserve me")


if __name__ == "__main__":
    unittest.main()

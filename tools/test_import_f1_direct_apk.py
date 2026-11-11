import hashlib
from pathlib import Path
import tempfile
import unittest
import zipfile

from import_f1_direct_apk import EXPECTED, import_from_apk


class DirectAPKImportTests(unittest.TestCase):
    def test_tampered_apk_assets_never_written(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            web = root / "web"
            web.mkdir()
            apk = root / "fake.apk"
            with zipfile.ZipFile(apk, "w") as z:
                for name in EXPECTED:
                    z.writestr("assets/" + name, b"tampered")
            report = import_from_apk(apk, web, apply=True)
            self.assertEqual(len(report["errors"]), len(EXPECTED))
            self.assertEqual(list(web.iterdir()), [])

    def test_missing_apk_assets_never_written(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            web = root / "web"
            web.mkdir()
            apk = root / "empty.apk"
            with zipfile.ZipFile(apk, "w"):
                pass
            report = import_from_apk(apk, web, apply=True)
            self.assertEqual(len(report["errors"]), len(EXPECTED))
            self.assertEqual(list(web.iterdir()), [])

    def test_existing_file_unchanged_on_bad_source(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            web = root / "web"
            web.mkdir()
            target = web / "home.js"
            target.write_bytes(b"existing-source")
            apk = root / "fake.apk"
            with zipfile.ZipFile(apk, "w") as z:
                for name in EXPECTED:
                    z.writestr("assets/" + name, b"tampered")
            import_from_apk(apk, web, apply=True)
            self.assertEqual(target.read_bytes(), b"existing-source")


if __name__ == "__main__":
    unittest.main()

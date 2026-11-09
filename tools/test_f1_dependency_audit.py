import tempfile
import unittest
from pathlib import Path
import zipfile

from f1_dependency_audit import audit


class DependencyAuditTests(unittest.TestCase):
    def test_reports_unresolved_relative_script(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            web = root / "web"
            web.mkdir()
            apk = root / "sample.apk"
            with zipfile.ZipFile(apk, "w") as z:
                z.writestr("assets/index.html", '<script src="missing.js"></script>')
            outcome = audit(apk, web)
            self.assertEqual(outcome["unresolved_in_apk"], ["missing.js"])

    def test_exact_and_changed_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            web = root / "web"
            web.mkdir()
            (web / "index.html").write_text('<script src="ok.js"></script>')
            (web / "ok.js").write_text("changed")
            apk = root / "sample.apk"
            with zipfile.ZipFile(apk, "w") as z:
                z.writestr("assets/index.html", '<script src="ok.js"></script>')
                z.writestr("assets/ok.js", "original")
            outcome = audit(apk, web)
            self.assertEqual(outcome["unresolved_in_apk"], [])
            self.assertEqual(outcome["files"]["index.html"]["status"], "exact")
            self.assertEqual(outcome["files"]["ok.js"]["status"], "different")


if __name__ == "__main__":
    unittest.main()

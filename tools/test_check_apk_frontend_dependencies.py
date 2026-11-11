import tempfile
import unittest
from pathlib import Path
import zipfile

from check_apk_frontend_dependencies import check

class FrontendDependencyTests(unittest.TestCase):
    def test_dependency_present(self):
        with tempfile.TemporaryDirectory() as td:
            apk=Path(td)/"test.apk"
            with zipfile.ZipFile(apk,"w") as z:
                z.writestr("assets/index.html", '<script src="main.js"></script><link rel="stylesheet" href="style.css">')
                z.writestr("assets/main.js", "console.log('ok')")
                z.writestr("assets/style.css","body{}")
            self.assertTrue(check(apk))
    def test_dependency_missing(self):
        with tempfile.TemporaryDirectory() as td:
            apk=Path(td)/"test.apk"
            with zipfile.ZipFile(apk,"w") as z:
                z.writestr("assets/index.html", '<script src="missing.js"></script>')
            self.assertFalse(check(apk))

if __name__ == "__main__":
    unittest.main()

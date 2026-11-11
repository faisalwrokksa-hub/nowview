"""Static release-signing safety and versioning regression checks."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SigningPolicyTests(unittest.TestCase):
    def test_release_signer_uses_external_key(self):
        s=(ROOT/"sign-release.sh").read_text(encoding="utf-8")
        self.assertIn('NEWVIEW_RELEASE_KEYSTORE',s)
        self.assertIn('NEWVIEW_RELEASE_ALIAS',s)
        self.assertIn('env:NEWVIEW_RELEASE_STORE_PASSWORD',s)
        self.assertIn('env:NEWVIEW_RELEASE_KEY_PASSWORD',s)
        self.assertIn('apksigner" verify',s)
        self.assertNotIn('pass:android',s)
        self.assertNotIn('keytool -genkeypair',s)

    def test_ci_does_not_run_release_signer(self):
        w=(ROOT/".github/workflows/dashboard.yml").read_text(encoding="utf-8")
        self.assertNotIn("sign-release.sh",w)
        self.assertIn("newview-test-apk",w)
        self.assertNotIn("NEWVIEW_RELEASE_STORE_PASSWORD",w)

    def test_gitignore_excludes_private_keys(self):
        rules=(ROOT/".gitignore").read_text(encoding="utf-8")
        for ext in ("*.jks","*.keystore","*.apk"):
            self.assertIn(ext,rules)

    def test_version_code_documented_and_manifest_declared(self):
        m=(ROOT/"android/AndroidManifest.xml").read_text(encoding="utf-8")
        doc=(ROOT/"docs/ANDROID_RELEASE_POLICY.md").read_text(encoding="utf-8")
        self.assertIn('android:versionCode=',m)
        self.assertIn('versionCode',doc)
        self.assertIn('app.newview.dashboard',doc)

if __name__=="__main__":
    unittest.main()

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'tools' / 'build-release-candidate-manifest.py'
spec = importlib.util.spec_from_file_location('newview_release_manifest', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SHA = 'a' * 40

class ReleaseCandidateManifestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.tv = root / 'tv.apk'
        self.phone = root / 'phone.apk'
        self.tv.write_bytes(b'OWNER SIGNED TV FIXTURE')
        self.phone.write_bytes(b'OWNER SIGNED PHONE FIXTURE')

    def mocked_sdk(self, executable):
        return '/trusted/' + executable

    def mocked_run(self, cmd):
        if 'apksigner' in cmd[0]:
            return 'Signer #1 certificate SHA-256 digest: ' + ('d' * 64) + '\n'
        name = 'app.newview.dashboard' if str(cmd[-1]) == str(self.tv) else 'app.newview.phonecaster'
        return f"package: name='{name}' versionCode='13' versionName='1.3.0'\n"

    def test_extract_real_binary_hashes_and_identity_leaving_authorization_blank(self):
        with patch.object(module, 'verified_sdk_tool', self.mocked_sdk), patch.object(module, 'run_checked', self.mocked_run):
            result = module.create(self.tv, self.phone, SHA)
        self.assertEqual(result['sourceCommit'], SHA)
        self.assertEqual(result['tvApkSha256'], hashlib.sha256(self.tv.read_bytes()).hexdigest())
        self.assertEqual(result['phoneApkSha256'], hashlib.sha256(self.phone.read_bytes()).hexdigest())
        self.assertEqual(result['tvSignerSha256'], 'd' * 64)
        self.assertEqual(result['versionCode'], 13)
        self.assertIsNone(result['previousVersionCode'])
        self.assertEqual(result['approvedBy'], '')
        self.assertEqual(result['privacyPolicyUrl'], '')
        self.assertEqual(result['distributionChannel'], '')

    def test_reject_wrong_package_or_unverifiable_signer(self):
        def wrong_package(cmd):
            if 'apksigner' in cmd[0]:
                return 'Signer #1 certificate SHA-256 digest: ' + 'f' * 64
            return "package: name='com.unknown.app' versionCode='1' versionName='1.0'"
        with patch.object(module, 'verified_sdk_tool', self.mocked_sdk), patch.object(module, 'run_checked', wrong_package):
            with self.assertRaisesRegex(ValueError, 'application ID'):
                module.create(self.tv, self.phone, SHA)

        def missing_signer(cmd):
            return 'Signatures verified' if 'apksigner' in cmd[0] else "package: name='app.newview.dashboard' versionCode='2' versionName='2.0'"
        with patch.object(module, 'verified_sdk_tool', self.mocked_sdk), patch.object(module, 'run_checked', missing_signer):
            with self.assertRaisesRegex(ValueError, 'fingerprint'):
                module.create(self.tv, self.phone, SHA)

    def test_reject_invalid_source_sha_and_missing_file(self):
        with self.assertRaisesRegex(ValueError, 'full source Git SHA'):
            module.create(self.tv, self.phone, 'abc')
        with patch.object(module, 'verified_sdk_tool', self.mocked_sdk), patch.object(module, 'run_checked', self.mocked_run):
            with self.assertRaisesRegex(ValueError, 'nonempty signed APK'):
                module.create(self.tv.with_name('missing.apk'), self.phone, SHA)

    def test_sdk_errors_do_not_expose_credentials(self):
        with patch.object(module, 'verified_sdk_tool', side_effect=ValueError('SDK missing')):
            with self.assertRaisesRegex(ValueError, 'SDK missing'):
                module.create(self.tv, self.phone, SHA)

if __name__ == '__main__':
    unittest.main()

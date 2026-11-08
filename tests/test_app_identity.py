"""Regression checks for NewView Android app identity and test build naming."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class AppIdentityTest(unittest.TestCase):
    def test_manifest_unique_app_identity(self):
        text = (ROOT / 'android/AndroidManifest.xml').read_text(encoding='utf-8')
        self.assertIn('package="app.newview.dashboard"', text)
        self.assertIn('android:label="NewView"', text)
        self.assertNotIn('package="dev.fintech.marketcharts"', text)

    def test_java_classes_and_accessibility_reference_identity(self):
        source = ROOT / 'android/src/dev/fintech/marketcharts'
        for name in ('MainActivity.java','ChartsView.java','HomePanelService.java','MarketData.java'):
            with self.subTest(name=name):
                content = (source / name).read_text(encoding='utf-8')
                self.assertIn('package app.newview.dashboard;', content)
                self.assertNotIn('package dev.fintech.marketcharts;', content)
        bridge = (source / 'ChartsView.java').read_text(encoding='utf-8')
        self.assertIn('app.newview.dashboard/.HomePanelService', bridge)
        self.assertIn('app.newview.dashboard/app.newview.dashboard.HomePanelService', bridge)

    def test_test_artifact_naming_matches_ci(self):
        bash = (ROOT / 'build-apk.sh').read_text(encoding='utf-8')
        powershell = (ROOT / 'build-apk.ps1').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/dashboard.yml').read_text(encoding='utf-8')
        for label, content in [('bash',bash),('powershell',powershell),('workflow',workflow)]:
            with self.subTest(label=label):
                self.assertIn('newview.apk', content)
                self.assertNotIn('market-charts.apk',content)
        self.assertIn('newview-test-apk',workflow)

if __name__ == '__main__':
    unittest.main()

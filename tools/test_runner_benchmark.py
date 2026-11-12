import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('benchmark', Path(__file__).with_name('summarize-runner-benchmark.py'))
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


class BenchmarkTests(unittest.TestCase):
    def test_incomplete_run_is_not_reported_as_zero_seconds_or_pass(self):
        report = benchmark.summarize({'jobs': [{'name': 'pending', 'started_at': '2026-11-12T10:00:00Z'}]})
        self.assertIsNone(report['jobs'][0]['elapsed_seconds'])
        self.assertIsNone(report['jobs'][0]['conclusion'])
        self.assertFalse(report['comparison_verified'])

    def test_real_timestamps_preserve_failure_and_parallel_job_durations(self):
        job = {'name': 'build', 'conclusion': 'failure',
               'started_at': '2026-11-12T10:00:00Z', 'completed_at': '2026-11-12T10:02:03Z'}
        report = benchmark.summarize({'jobs': [job, job]})
        self.assertEqual([j['elapsed_seconds'] for j in report['jobs']], [123, 123])
        self.assertEqual(report['jobs'][0]['conclusion'], 'failure')
        self.assertFalse(report['comparison_verified'])

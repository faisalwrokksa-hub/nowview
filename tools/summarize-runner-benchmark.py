"""Summarize exported GitHub jobs JSON without inventing timing/cache evidence.

Usage: python3 tools/summarize-runner-benchmark.py hosted-jobs.json [isolated-jobs.json]
Export with: gh api repos/faisalwrokksa-hub/nowview/actions/runs/RUN_ID/jobs
"""
import datetime as dt
import json
import sys


def duration(item):
    start, end = item.get('started_at'), item.get('completed_at')
    if not start or not end:
        return None
    return (dt.datetime.fromisoformat(end.replace('Z', '+00:00')) -
            dt.datetime.fromisoformat(start.replace('Z', '+00:00'))).total_seconds()


def summarize(payload):
    return {'jobs': [{'name': job['name'], 'runner': job.get('runner_name'),
                     'conclusion': job.get('conclusion'), 'elapsed_seconds': duration(job),
                     'steps': [{'name': step['name'], 'conclusion': step.get('conclusion'),
                                'elapsed_seconds': duration(step)}
                               for step in job.get('steps', [])]}
                    for job in payload.get('jobs', [])],
            'cache_hit_miss': 'Not provided by jobs API; inspect Gradle profile and build logs.',
            'comparison_verified': False}


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    reports = []
    for filename in sys.argv[1:]:
        with open(filename, encoding='utf-8-sig') as source:
            reports.append({'input': filename, **summarize(json.load(source))})
    print(json.dumps(reports, indent=2))

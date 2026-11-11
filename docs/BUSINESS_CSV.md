# NewViewBusiness — local data dashboard

NewViewBusiness accepts a locally selected CSV. No paid API or server, database, account or upload is required.

## Required CSV schema
```csv
date,revenue,cost,orders,customers
2026-01-01,100,60,5,10
2026-01-02,120,65,7,11
```
The example above is **format documentation only** and is never displayed as user business data.

- Dates are ISO `YYYY-MM-DD`, unique per record.
- Revenue and cost are nonnegative decimal amounts with at most two decimal places; `orders` and `customers` are nonnegative whole numbers.
- `customers` is a snapshot for each row; latest row is displayed, not a sum.
- Difference = revenue − cost; this is **not audited net profit** and does not necessarily include all business expenses.
- Difference % is shown only if revenue > 0. Units/currency are not guessed.
- Up to 5,000 rows or 1 MiB; malformed or oversized files are rejected. The latest 12 dated revenue records are plotted.
- Parsing and rendering occur entirely on the local client. Loaded data is held in memory for the current page only and is not uploaded or persisted. No sample figures are populated.
- CSV files may contain sensitive information; select only files you are authorized to analyze. Android TV file selection requires device testing and may not be supported in all launchers. Web, desktop, and mobile browsers are primary targets.
- Tests exercise header and value validation, quoted CSV values, ordering, aggregates, no-division-by-zero and absence of data upload calls.

Future: opt-in business APIs, account-scoped permissions, currency metadata, dated series comparisons, privacy impact assessment and authenticated customer isolation. Do not enable remote business data collection without a separate approval.

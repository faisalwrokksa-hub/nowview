# NewView — Owner-only commercial operations

Prelaunch status: plans are drafts, with no pricing, checkout, authenticated customer accounts, invoices, or verified paid entitlements. Settings includes a plans preview, read-only release notices, and a local unsent support-request draft. **These are not live subscription services.**

## Local admin workflow (Node 22)

Create a private owner-only file:

    node tools/newview-ops.mjs newview-ops.private.json init
    node tools/newview-ops.mjs newview-ops.private.json status

Only store opaque internal customer references such as customer-001. Never enter personal identifiers, passwords, card numbers, signing keys, customer CSVs or pairing links into this local store.

### Plan requests, renewals and cancellations

    node tools/newview-ops.mjs newview-ops.private.json customer:add customer-001
    node tools/newview-ops.mjs newview-ops.private.json subscription:request customer-001 personal
    node tools/newview-ops.mjs newview-ops.private.json subscription:review customer-001
    node tools/newview-ops.mjs newview-ops.private.json subscription:renewal customer-001
    node tools/newview-ops.mjs newview-ops.private.json subscription:review-renewal customer-001
    node tools/newview-ops.mjs newview-ops.private.json subscription:cancel customer-001
    node tools/newview-ops.mjs newview-ops.private.json subscription:close customer-001

These are draft administrative requests; review does NOT activate a subscription, bill a customer, renew a real service, process a real cancellation or unlock premium features. Production entitlementFor always returns unverified/unpaid. Real account administration requires an authenticated server and approved billing integration.

### Local support cases

Put a non-sensitive problem summary in a private text file, then:

    node tools/newview-ops.mjs newview-ops.private.json ticket:open customer-001 technical issue.private.json
    node tools/newview-ops.mjs newview-ops.private.json ticket:status case-000003 investigating

Use the actual generated case ID, not the example above. No email, message or support ticket reaches a real provider.

### Release notice drafts

Create two owner-private text files for title and release message.

    node tools/newview-ops.mjs newview-ops.private.json notice:draft notice-title.private.json notice-message.private.json
    node tools/newview-ops.mjs newview-ops.private.json notice:approve notice-000004 reviewer-001
    node tools/stage-release-notices.mjs newview-ops.private.json newview-notices.preview.json 2026-11-12

The generated preview is local and not published. The notice ID and date are examples and must be replaced by verified values. After owner review, manually copy only public non-sensitive approved entries to the bundled web/release-notices.json via a reviewed pull request. There are currently zero actual customer release notices.

## Commercial launch gates

The plan catalog at web/commercial-catalog.json is explicitly not open for sales. Before commercial charging, approve price/currency, taxes, refunds, legal terms, customer support/privacy contacts, payment processor, identity provider, device entitlements, data retention, and regional media/content rights.

The dry-run-first owner release packaging process is documented in docs/LOCAL_PILOT_RUNBOOK.md. Do not publish a release until physical device acceptance, seven commercial rights categories, signed APK continuity, account policies, and owner approval have real evidence. An APK alone is not a Google Play AAB submission.

## Safety and data boundaries

The private operator tools never call external services or charge customers. Private files are ignored by Git. The public app only reads bundled draft plan data and already-reviewed notices, and exports local support drafts. Neither the owner workstation workflow nor an approved notice can change GitHub branch protection, deploy Cloudflare, or grant commercial licenses.

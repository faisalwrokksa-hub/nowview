# NewView customer-facing privacy and support — release draft

**DRAFT — NOT APPROVED FOR PUBLICATION.** The account owner must complete the placeholders and review data flows, cookie policy, source licenses, Cloudflare settings and consumer obligations. Do not copy this to the production website until reviewed.

## Privacy notice — draft

**Service:** NewView dashboards for web and Android TV / mobile companion.

**Legal operator:** [LEGAL COMPANY NAME AND JURISDICTION REQUIRED]

**Effective date and privacy contact:** [DATE REQUIRED] · [VALID CONTACT EMAIL OR URL REQUIRED]

### What information is handled
- **Device-local preferences:** layouts, home shortcuts, display options, browser/watch bookmarks and saved social-profile links may be stored in the browser or app's local storage until cleared. These preferences are not necessarily synchronized across devices.
- **Optional local CSV analysis:** when the user selects a business CSV file, its rows are read and summarized within the browser using device memory. The CSV feature's code does not upload those records; avoid uploading confidential company files to other websites reached through the browser.
- **Optional encrypted layout pairing:** if enabled and authorized through the hosting access system, device-sync operations send an encrypted layout blob to NewView's service, associated with a pseudonymous, subject-scoped pairing partition. The decryption key is generated on the client and shared by the pairing link. The link is sensitive: anyone with the link and the required access authorization may join the room. Revocation is supported. **Confirm production Cloudflare Access policy, Durable Object expiration/retention, backup practices, and access-log retention before publication.**
- **Network requests:** when using a third-party stream, website, official YouTube player, RSS feed or quote endpoint, the destination operator may receive normal internet metadata such as IP address, user agent and request time, subject to that operator's terms. NewView cannot control third-party cookies, DRM or advertisements.
- **Diagnostic and service records:** [VERIFY WHICH CLOUDFLARE / HOST LOGS / CRASH REPORTS ARE ENABLED, THEIR PURPOSES, RETENTION PERIODS, RECIPIENTS AND TRANSFERS]. Do not claim that there are no logs without provider verification.

### User control
Users can clear relevant local bookmarks/profiles/preferences on their device; the optional pairing workflow supports revoking a room. Clearing local storage is not necessarily the same as deleting network logs. [ADD CONFIRMED DATA ACCESS/DELETION REQUEST PROCESS].

### Legal bases, location, retention, security and minors
[LEGAL REVIEW REQUIRED: legitimate interests/consent/contract; jurisdictions and transfers; child/minor eligibility; cookies and consent; provider retention; breach and consumer rights procedures.] Do not include an unsupported GDPR/CCPA compliance claim.

## Support and customer notices — draft

**Support contact:** [VALID NEWVIEW SUPPORT EMAIL/URL REQUIRED]

**Supported devices:** [LIST ANDROID TV VERSION / HARDWARE MODELS VERIFIED BY PHYSICAL QA]. A successful emulator build does not establish compatibility.

**Data availability:** Quotes, news, public playlists, video sites and channels depend on independent publishers and may be delayed, restricted, unavailable or inaccurate. NewView is an information display tool, not a broker, adviser, trading executor, streaming-rights grant or way to bypass publisher restrictions. Confirm any mandatory regional disclaimers.

**Playback:** Licensing and territorial availability vary by broadcaster. Some websites block framing; in those cases, users must use the publisher-approved external browser or native experience. YouTube embeds remain subject to YouTube and video-owner policies.

**Troubleshooting workflow:** For a failed launch, report device model, OS, NewView versionCode and SHA-256 where possible, steps to reproduce and redacted diagnostics. **Never send device pairing links, passwords, identity tokens, customer CSV contents or signing keystores.**

**Support service hours / response commitments:** [OWNER MUST SELECT]. Do not publish an invented SLA or reimbursement promise.

**Terms, refunds, warranty, subscriptions and incident contact:** [COMMERCIAL/LEGAL APPROVAL REQUIRED BEFORE CHARGING USERS].

## Publication gate

- [ ] Operator legal name, address, support and privacy contact approved.
- [ ] All actual data recipients, retention windows, cookies and hosting jurisdictions verified.
- [ ] Third-party terms and seven source-rights categories reviewed by authorized reviewers.
- [ ] Physical Android TV and browser acceptance recorded, including accessibility and device sync.
- [ ] Customer subscription, billing, cancellation/refund and security reporting terms reviewed.
- [ ] Owner signs and dates an explicit release approval and publishes the final notice.

Until completed, this draft must remain in the source documentation only. It must **not** be represented as an approved consumer privacy policy.

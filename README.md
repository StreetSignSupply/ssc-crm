> **Editing the CRM:** change `next/index.html`, not `public/index.html`. Every push runs the release check
> (`tests/smoke.mjs`, workflow `crm-release.yml`); a build that passes is copied to `public/index.html` automatically.
> Put an earlier release back: run "Release the CRM" with the version in `rollback`.

# Street Sign Supply CRM — builds

`public/index.html` is the CRM. crm.streetsignsupply.com loads this file from this repository every time it opens
(via a small loader page on the host), so a new version only needs a push here.

- `public/index.html` — the CRM page (version in `APP_VERSION`)
- `loader/index.html` — the one-time loader page that lives on crm.streetsignsupply.com
- `CHANGELOG.md` — what changed in each version

## CRM worker (runs the CRM in the cloud)
`.github/workflows/crm-worker.yml` runs `worker/run.mjs` every 15 minutes: it opens the CRM headless
for 3 minutes so the agents' feed rows are applied and the outbound sync runs, even when nobody has
the CRM open. It needs one repository secret, `FIREBASE_SERVICE_ACCOUNT` (the JSON key from Firebase
console > Project settings > Service accounts > Generate new private key). Without it the job exits quietly.
Logs print counts only.

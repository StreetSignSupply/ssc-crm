# Street Sign Supply CRM — builds

`public/index.html` is the CRM. crm.streetsignsupply.com loads this file from this repository every time it opens
(via a small loader page on the host), so a new version only needs a push here.

- `public/index.html` — the CRM page (version in `APP_VERSION`)
- `loader/index.html` — the one-time loader page that lives on crm.streetsignsupply.com
- `CHANGELOG.md` — what changed in each version

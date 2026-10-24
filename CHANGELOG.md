# What changed

## 2026.11.18-1 — 2026-10-24
- Quotes from the sales agents now arrive WITH their lines: a feed row can carry `lines` (JSON or "10 x R1-1 | Stop | 30x30 | HIP @ 50.43"); the project opens as Quoted with a quote number and amount. Without lines it stays an Inquiry (no more empty "Quoted" projects). A later row with `updates` = the original row_id replaces the lines.
- Website catalogue: Settings → "Pull the website catalogue now" (daily on your own site) loads every product on streetsignsupply.com with its picture, sizes, materials, prices and quantity tiers from the agents' sheet. "Browse the price list" on a quote has a Website tab with pictures; a line named like a website product prices itself and carries the picture onto quotes and work orders.
- Material names from the website (Engineering Grade / High Intensity / Diamond Grade) are understood as EG / HIP / DG3 for costing and pricing.

## 2026.11.17-1

**Only public/index.html changed.** Upload that one file into the subdomain's public_html, choose Overwrite,
flush the SiteGround cache, then Ctrl + Shift + R. Leave firebase-adapter.js, shim-core.js, import.html,
firebase-config.js and .htaccess exactly as they are.

**Order sync — quotes and work orders go out to the SSS Pipeline sheet the moment they're saved,** so
Claude's agents always see the current state.

- **Settings → Branding → Order sync**: paste the Apps Script web app link (from CRMOrderSync.gs) and
  leave "Send quotes and work orders automatically" ticked. **Send test** puts a TEST row on the
  CRM Orders tab; **Send all open quotes and work orders now** fills the tab the first time.
- Sent on: a new quote or work order, quote lines changed, won, proof approved, released, shipped,
  picked up (will call), invoiced, paid, closed, lost, and any other edit that changes what the sheet shows.
- Each record goes 3 seconds after the last change to it, so a run of edits is sent once. Saving never
  waits on Google. If Google can't be reached it waits on that computer and tries again on opening and
  every 5 minutes. "Last sent" and any failure show under the setting.
- What's sent: customer, contact, email, phone, billing address, ship-to, PO, project, every line
  (qty, item, description, size, material, unit price, line total), subtotal, shipping, tax, total,
  terms, due date, ship date, tracking, notes.

## 2026.11.16-1

**Only public/index.html changed.** Upload that one file into the subdomain's public_html, choose Overwrite,
flush the SiteGround cache, then Ctrl + Shift + R. Leave firebase-adapter.js, shim-core.js, import.html,
firebase-config.js and .htaccess exactly as they are.

**Sales pipeline feed — Claude's sales agents write into the CRM.** The agents keep everything they do in one
Google Sheet: prospects found, emails sent and answered, calls, quotes. The CRM now reads that sheet.

- **Settings → Branding → Sales pipeline feed**: paste the sheet's published-CSV link and leave
  "Bring the feed in by itself" ticked. On crm.streetsignsupply.com the CRM then checks the sheet every
  15 minutes and on opening, the same as website orders.
- **Projects → Import pipeline feed** checks the sheet now, or takes the CSV file / pasted rows
  (that is how it works inside Claude, which can't reach Google).
- Accounts and contacts are matched by email, then by name, and made when new. Government accounts
  come in tax-exempt on Net 30.
- Each email and call lands in the account's activity area, marked **AI**, with the check-back date
  the agent set, so it shows up on the chase list.
- Quotes open as **Inquiry** projects (or whichever stage the agent gave) with the quoted amount.
- Every row has a row_id; a row already in the CRM is never brought in twice, even from two screens.

Sheet columns: row_id, type, account, account_type, phone, website, street, city, state, zip, contact, title,
email, contact_phone, activity, direction, subject, text, when, back_on, project, amount, stage, source.

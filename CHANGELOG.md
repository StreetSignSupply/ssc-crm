# What changed

## 2026.11.24-1 — 2026-10-24
- Follow-up autopilot: every quote gets day 3, 7 and 14 touches written by the agents in your voice, shown on the project with Send, Skip and Edit, or switched to automatic per project
- stops itself when the customer replies or the job is won or lost
- Reminders per user: proof not approved, PO with no work order, shipped with no tracking, invoice past terms, reorder due, follow-up due
- each person gets their own by email (text when the number exists), instant or daily digest
- bell menu with snooze and done
- Drafts menu on the project: proof approval, shipping notice, invoice reminder, follow-up, thank-you, each written by the agents and sent from your mail with one click

## 2026.11.23-1 — 2026-10-24
- Email from the CRM, logged for every user with no API keys: a contact's email opens Gmail (or your mail app) with the copy address crm@streetsignsupply.com on it, the CRM logs the email at once and the Email Logger agent fills in subject and replies
- the CRM now sends its accounts and contacts to the agents so every address is known
- Customer declined the clear overlaminate: a checkbox on printed lines that removes the laminate from cost, price, the work order route, the material plan, and prints the note on the quote and traveller
- feed lines accept overlaminate: false

## 2026.11.22-1 — 2026-10-24
- Accuracy audit: 640 checks against independent calculations, all pass. Won this month and win rate count projects that skipped the Won step
- every date is local (no more off-by-one after 6 PM)
- invoice PDF shows the real invoice and due dates
- margin shows a dash when no cost is booked
- piece counts exclude charges
- past-due counts exclude shipped and invoiced work
- access levels hide prices and costs completely
- due on receipt is past terms after 3 days
- deposits count only as the deposit
- shipped and invoiced jobs show Shipped and Invoiced instead of late
- next step on invoiced work is Waiting on payment with the due date
- sales tax labelled as an estimate with QuickBooks deciding, freight not taxable in QuickBooks rows
- a price typed with a dollar sign or comma is a price
- sample records are out of every KPI and badge

## 2026.11.21-2 — 2026-10-24
- Project tab strip: the lines tab is called Quote

## 2026.11.21-1 — 2026-10-24
- New navigation: left sidebar with grouped pages (Dashboard with the Matt's | Company switch, Sales, Production, Inventory, Reports, Admin), slim top bar with page title, search, New, Find, Assistant and bell
- collapses to icons on smaller windows, phone keeps the bottom bar
- content capped at 1440 px
- Website pictures now reach every sign by MUTCD code (about 200 codes from the site), so a line typed as R1-1 shows its picture on quotes and work orders

## 2026.11.20-3 — 2026-10-24
- One Dashboard entry in the nav: each signed-in person lands on their own dashboard (Matt's dashboard)
- the owner, or a team member the owner ticks in Team & access, can flip to the Company dashboard with the toggle beside it
- New quote wording in the wizard buttons

## 2026.11.20-2 — 2026-10-24
- Wording: a project's lines are Quote lines everywhere (card, editor, history, checks)
- what the shop builds is a Work order
- 'order' on its own now only means a website order or a material order
- the wizard is New quote

## 2026.11.20-1 — 2026-10-24
- Fresh look: calm neutral base with brand red as the accent, one header and one nav row, sentence-case titles, clear status colours, three button tiers, dark mode redone, no horizontal scroll on phones
- Project page: read-only stage track with dates and days-in-stage, one Next action, Change stage menu, Documents menu (quote PDF, proof PDF, invoice lines, uploads), one Notes card, invoice number lives in Billing only, duplicate buttons removed
- Settings in groups (Company, Pricing, Connections, Production, Codes & pictures, Team & access, Data, How it works) with one Save bar
- Dashboard Today strip
- cost sheet card shows status with Pull now on the site or an .xlsx picker in Claude
- help hints visible instead of i buttons

## 2026.11.19-1 — 2026-10-24
- Agent quotes can no longer move a job backwards or orphan its work orders
- bad prices are rejected instead of imported as $0
- imported customers default to Contractor/Prepay (government = Net 30, exempt)
- one invoicing path: the accountant invoices from the order sync and the invoice number flows back into the CRM
- 40% quote floor enforced in the price box
- quantity breaks work
- margin shows — with no cost
- cost sheet loads itself from the agents' mirror of the NewCo workbook
- new feed lanes: setting, inventory, invoice

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

# What changed

## 2026.11.25-27 — 2026-10-27
- Accounts: Merge into another account
- list shows 100 at a time
- Overlaminate: an account can be set to not want it, and its new quote lines start without it
- Close-out paperwork checks use the file category and flag another customer's document
- Stock never goes below zero — pulls past the count flag a recount, shown in Inventory
- Claims of a team record need the owner's OK once the owner has claimed theirs, with an owner prompt
- typed initials no longer grant access after that
- Agents' feed no longer comes in by itself and never plans follow-ups
- Past due uses one rule everywhere
- On the floor no longer repeats the name
- Exempt accounts without a certificate date are flagged
- duplicate warning matches names only in the same state
- Fixes run through the CRM for P-2008, P-2009, P-2012, P-2018, old work orders, reps, contacts, duplicates and negative stock

## 2026.11.25-26 — 2026-10-27
- Calendar: events can belong to an account with no project
- accounts show a Schedule card and a New event button
- Tax exempt: accounts the agents created are no longer exempt without a certificate, and ticking exempt needs the expiry date
- Invoicing while quote lines are on no work order asks why and records it
- A work order can't be released with unpriced lines
- Close-out checks margin against your minimum and looks for the quote PDF, PO and invoice
- Follow-ups only on a priced quote with someone to email, and nothing sends by itself
- Material pulls that would go below zero ask first and flag a recount
- Sign-ins not on the team list get Shop access once the owner has claimed their record
- Order sync sends closed projects and every work order
- sheet tax leaves out freight
- Prepaid and card orders never show past terms
- Past-due counts leave out archived and closed work and show the breakdown
- Duplicate-account warning, contact name and email checks
- Archive mass delete needs delete typed
- Work order status steps spaced out
- Agent feed worker paused
- one-time record clean-up

## 2026.11.25-25 — 2026-10-26
- Custom signs no longer get a made-up box of words as their picture
- Sign pictures lists every line, and lines without a real picture show No picture yet with an Add picture button (pick the uploaded artwork or upload one)

## 2026.11.25-24 — 2026-10-26
- Website catalogue pull fixed on the hosted CRM: it failed every time (the database refuses price tiers stored as nested lists), so website prices and the 1,761 stencils never loaded
- the catalogue is now saved as text

## 2026.11.25-23 — 2026-10-26
- Quotes: shipping is always called Shipping
- contract (unit-price) quotes say clearly there are no set quantities
- quotes with quantities show Qty, unit price and amount

## 2026.11.25-22 — 2026-10-25
- Quotes and invoices always show Signs, Shipping (or Delivery), Subtotal, Sales tax and a Total, including bid unit-price quotes

## 2026.11.25-21 — 2026-10-25
- Quotes and invoices use the Catalog look by default (Matt's pick)

## 2026.11.25-20 — 2026-10-25
- Quotes: removed 'Made in Washington, Utah' and 'A real person'
- three promises: MUTCD, 3M sheeting, fast confirmation

## 2026.11.25-19 — 2026-10-25
- Quote and invoice redesign: light and clean, no black blocks, no bid-item tags, one spec line per sign, code shown quietly beside the name
- three looks to choose from in Settings (Documents and emails)

## 2026.11.25-18 — 2026-10-25
- Files: a Sign pictures gallery shows each quote line's picture with View/Save and a Make the proof for approval button
- proofs include every line's picture even when no artwork was uploaded
- proof names and sheeting read cleanly

## 2026.11.25-17 — 2026-10-25
- New quote and invoice design: branded header with the quote number on a red sign plate, large sign pictures, clean product names with code, size and sheeting chips, a personal note, Why Street Sign Supply strip, bold total, and a 3-step Ready to order block
- SVG drawings are drawn crisply into the PDF

## 2026.11.25-16 — 2026-10-25
- Work orders and quotes: pictures from other websites are copied into the PDF instead of being dropped
- if one can't be copied, the sign's drawing (or its name) shows instead of a blank box
- codes saved with the size attached (R1-1|30X30) find their picture

## 2026.11.25-15 — 2026-10-26
- Quote pictures always match the line: a coded sign (R6-1, W1-2, R2-1…) finds the website sign with the same legend and direction ("left" never shows a right arrow, "Speed Limit 25" shows 25); with no direction given, the right-hand version is used every time
- A line with no picture anywhere gets a clean drawing that carries its own words; a warning sign is a diamond only when it's square (an 18x24 alligator sign is a yellow rectangle)
- The order sync now says which picture each line shows (picture_name), so the agents check it against the description
- Bids priced per sign print as a Unit price schedule (Unit / Unit price, no made-up total); set priceMode "total" on a project to force a normal quote

## 2026.11.25-13 — 2026-10-26
- Quote and invoice layout: numbered lines, a larger picture in its own box, the sign's name in bold with the spec under it, bid item numbers as a small red tag, and size/grade no longer printed twice
- A note shared by several lines ("Typical picture; legend per county order") prints once under the table, marked †
- The overlaminate sentence only prints when the quote has printed signs and the notes don't already say it; scope keeps its line breaks

## 2026.11.25-12 — 2026-10-26
- Quote lines on the project page now show the picture saved on the line (they were falling back to plain drawings)
- "3M Diamond Grade" sheeting no longer turns a regulatory sign's drawing into a yellow warning diamond; the MUTCD code sets the shape
- Every picture link is test-loaded once: a link that doesn't load is never shown as an empty box on the quote PDF, the item's website/library picture is used instead, and the order sync reports it as "broken" so the agents replace it
- Wikimedia thumbnails at a non-standard width (refused by Wikimedia) are asked for at 330px

## 2026.11.25-11 — 2026-10-25
- Documents the agents save in Google Drive (RFPs, bid forms, W-9s, certificates) now act like real files in the CRM: a PDF tile, View opens the PDF inside the CRM, and Download saves the PDF in one click (Google Docs download as PDF)

## 2026.11.25-10 — 2026-10-25
- RFP and bid documents: agents can file RFPs, bid forms, addenda, W-9s, certificates, registrations and contracts as their own file types
- a file can go on the account itself
- and every account's Files card now also shows the files on its projects and work orders, labeled by P-number

## 2026.11.25-9 — 2026-10-25
- Agents can put a real picture on any quote line: an img link on feed quote lines, or a new picture row that adds pictures without touching prices
- work orders show the quote line's picture
- the order sync reports each line's picture as photo, drawing or none so the agents fill every gap

## 2026.11.25-8 — 2026-10-25
- Emails from the CRM copy the agents' address as a hidden Bcc, so customers no longer see crm@streetsignsupply.com
- quote and work-order lines with no picture on file now find the website sign by its MUTCD name (R6-1 One Way), and generic bid items (regulatory, warning diamond, stop, yield, guide) show a plain sign-shape picture instead of a blank

## 2026.11.25-7 — 2026-10-25
- Staff only see what their access level allows: shop users see no prices, sales users see no costs, and only the owner opens Settings or the Company dashboard
- New team members start as Sales and two people can't share initials
- A 1/8 stencil on the quote stays 1/8 on the work order
- Declining the clear overlaminate lowers the cost and the price
- Project cost and margin count the quote lines before a work order exists
- Work order, project and quote numbers are never reused
- Quote PDFs no longer end with a blank page
- Blanks on order say ON ORDER on the pull list
- Due on receipt is a payment term and saving an account keeps its terms
- An expired tax certificate charges tax and shows Cert expired
- Negative amounts print as -$25.00
- Agent feed rows with no id, or updates aimed at nothing, are counted bad
- Moving a project back from Invoiced clears the invoiced mark
- One primary contact per account
- Saving a project no longer changes Came in from or hands out quote numbers
- Search finds invoice and phone numbers
- Open pipeline by rep shows Unassigned
- Wording: work order instead of job, QC, pieces/projects plurals, PO kept on one line

## 2026.11.25-5 — 2026-10-25
- An open CRM updates itself: every 20 minutes it checks for a newer version and reloads when nobody is typing

## 2026.11.25-4 — 2026-10-25
- Agents can move duplicate and test projects (and empty test accounts) to the recycle bin — never one with a work order or an invoice

## 2026.11.25-3 — 2026-10-25
- Sign pictures now print on work orders, quotes and proofs (website pictures are copied into the PDF instead of being left out)
- agents' revised quote lines find their project by number or name, never making a second one

## 2026.11.25-2 — 2026-10-25
- Stencil price list in the CRM: 1,761 stencils in 5 grades (LDPE .125, LDPE .063, HDPE .030, HDPE .250, ALUM .080) load with the website catalogue
- grade sanity fixes (4in number kit HDPE .250 was 5744, now 723.50)

## 2026.11.25-1 — 2026-10-25
- Agents can run projects: feed rows to move a project's stage (with the same checks as the buttons), create work orders from the quote, attach signed quotes, POs, artwork and proofs as links (a signed quote or PO moves the job to Won
- an approved proof is filed and ticked), and update work orders with status, carrier and tracking
- switch in Settings to let agents act or only suggest
- materials on order from purchase orders show on inventory with expected date, receipts clear them, low stock counts what is on order

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

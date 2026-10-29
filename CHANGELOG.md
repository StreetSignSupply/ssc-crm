# What changed

## 2026.11.25-68
- Tighter database rules, ready to apply from Settings → Data ("Apply the updated rules"): people change only their own team record (never its level), the shop key moves to a record only owners and office can read, change history can't be cut short, the shop can't change quote prices, billing or stage fields, and only owners and office change what items cost. Updated rules only go live when the owner applies them, and fall back by themselves if the CRM doesn't confirm.
- The shop (WooCommerce) key is saved in settings/secrets instead of the general settings everyone reads.
- Background jobs' copies of the CRM no longer send reminders (each job run was sending its own copy — the Q-1011 proof reminder went 5 times).
- QuickBooks check: never sets a paid date to today (the invoice copy has no payment date); every change it makes is tagged "Fix run" with its run number and the values it replaced; projects whose total is far from the invoice are only flagged.

## 2026.11.25-67
- Inventory → Purchase orders: every order placed with a vendor (yours and the Material Planner's, e.g. PR-20261026-1), open / received / late, with "New purchase order" (vendor, items, qty, price, expected date; optional email to the vendor) and "Receive" on each line — stock goes up, "on order" comes down, what was paid is recorded, and "Last bought" fills in for that vendor.
- Stencils list: material item, material cost and CNC cost columns for the grade picked; the CSV adds CNC minutes. Flags now also catch a grade with no sheet in inventory or a sheet with no cost, and a stencil with no sq ft.

## 2026.11.25-66
- Bare aluminum blanks on a quote (no sheeting) are costed from the blank in inventory for that size and gauge (12x24 and 24x12 are the same blank); if inventory has no such blank with a cost, the line says "no blank in stock list". P-2014's 30 blank lines were showing "needs a grade".

## 2026.11.25-65
- Opening the CRM shows a plain "Loading your data…" screen while the Google sign-in comes back, instead of flashing the sign-in card.
- On crm.streetsignsupply.com an owner on the team list with a sign-in email counts as claimed, so the "Lock the CRM to your sign-in" banner no longer shows there (the database lock now keeps everyone else out).
- QuickBooks check runs each morning: invoice numbers, invoice dates, tax and paid status in the CRM follow QuickBooks; totals that differ are listed on the "QB Check" tab, never changed.

## 2026.11.25-64
- Releases are checked before they go live: work happens in next/index.html; every change runs the release check (every main page and several forms with made-up data) and only a build that passes is copied to public/index.html, the one crm.streetsignsupply.com loads. A failed check leaves the live CRM as it was. An earlier release can be put back by version.
- The "newer version ready" note now follows the release actually live (public/version.txt), not the changelog.

## 2026.11.25-63
- Settings → Data → Database lock (owners, on crm.streetsignsupply.com): "Turn the lock on" puts the team-only database rules live within 10 minutes (tested first). The CRM confirms it still opens; if nothing confirms within 20 minutes the old rules come back by themselves. "Turn the lock off" puts the old rules back.
- Settings → Data notes the automatic nightly backup.

## 2026.11.25-62
- Stencils: the SKU shows under each stencil in "Browse the price list", and searching by SKU works with or without the dashes (SSS-FAA-108-01, FAA108).
- Aluminum .080 stencils are costed from the full aluminum sheets in inventory (any full sheet that says .080 aluminum — small sign blanks aren't used); the cheapest per sq ft is picked unless you choose one.
- The 99 stencils pulled from the 25 Oct price list are held: listed with the reason, not offered on quotes. Open one to fix its sq ft, "Price at the 40% floor", and "Release for quoting". A repriced stencil's price date is the day you did it.
- A sign line with no sheeting grade says "needs a grade" instead of a blank cost (P-2014 has 23 of these).
- Behind the scenes: the owner's CRM keeps a list of who may sign in (one record per team member's sign-in), ready for the database lock.

## 2026.11.25-61
- Visual review, part 1: nothing smaller than 12px for labels, table headings, pills, times and section captions (print and PDF layouts unchanged); darker secondary gray text; orange text darkened to pass contrast.
- Form fields have visible borders and a blue focus ring (red stays for brand and alarms); disabled buttons read clearly instead of fading out.
- Delete buttons look like delete buttons (red outline); buttons are a little taller, and 44px tall on touch screens.
- Numbers line up (tabular figures) and never break mid-number.
- Long lists keep their column names at the top while you scroll.
- The browser tab shows where you are ("P-2014 Yavapai… · SSS CRM") and has an SSS icon.

## 2026.11.25-60
- From the 29 Oct design review: list pages sort by any column heading (click again to reverse; accounts sort as a whole list).
- A new version no longer reloads the page under you: a note offers "Reload now"; only a screen nobody is using updates by itself, and background jobs never reload.
- Money and counts in right-hand columns no longer break across lines.
- Accounts list shows the rep as text (change it on the account's Edit) — no dropdown to change by mistake.
- Work order Delete moved to the left, away from "Move to QC".
- Sidebar "History" is now "Change history".
- Inventory "Out of stock" counts only items with a reorder point; the rest show as a note.
- Contacts list has a Last contacted column (last call, email or meeting logged with them).
- Smaller gray text is darker and easier to read.
- Settings warns before you leave with changes not saved.
- Reminder emails and texts go to one person each — the rep the reminder belongs to, or the owner — not a copy to everyone.

## 2026.11.25-59
- Stencils: every stencil in the 1 Sep catalog (1,785, with its catalog picture) plus the 75 more on the 25 Oct approved price list — 1,860 in all — under Inventory → Stencils. SKU, name, blank size, pieces, material sq ft, a price for each grade and the date the price was set.
- Each grade (LDPE .125, LDPE .063, HDPE .030, HDPE .250, ALUM .080) is cut from an inventory sheet; cost = sheet cost per sq ft (preferred vendor price + freight) × material sq ft × 1.15 waste + CNC labor (25 Oct rates). Changing the sheet's vendor or price changes every stencil. Rates, the sheet for each grade and a stencil's sq ft can be changed on the page.
- A stencil that can't be costed (no sheet for its grade, no cost on the sheet, no sq ft) says so and is never costed at $0; the quote total's margin waits for it.
- Stencils are in the quote line picker (Stencils); the line carries the SKU, its cost locks at quoted like any other line, margin shows, and it makes a stencil work order that plans the sheet from the stencil's own sq ft.
- Download CSV on the Stencils page; the same rows go to the "CRM Stencils" tab of the SSS Pipeline sheet every Monday morning.

## 2026.11.25-58
- Closing a Files card keeps the first 2 files showing with "Show N more"; clicking that on a closed card opens the card and all its files.
- Locked job costs now show: the quote lines table shows the locked cost with "locked <date>" (the table was dropping the lock and recomputing), and the line editor shows a "locked" tag.
- Re-price only shows before a project is won.

## 2026.11.25-57 — 2026-10-28
- Receiving no longer changes an item's cost: each receipt records what was paid (price, freight, date, vendor) on the stock movement and as the item's Last paid; the item's cost — what quotes and work orders use — is always the preferred vendor's price + freight and only changes when the preferred vendor or its price is edited
- An item shows a warning when the last price paid is more than 2% off the cost quotes use, with Update the price
- Vendor prices have Freight per unit (Add a vendor and Edit, default $0); the vendor table shows Price, Freight and Landed, and Lowest cost goes by landed
- A vendor price whose vendor is missing shows "Vendor missing" and can be re-pointed with Edit
- Material cost is locked on each job: when a project is quoted (or is further along) each quote line keeps that day's cost; margins on quotes, work orders and projects use the locked cost, so changing an item's cost later never moves an old job's margin. Editing what a line is made of retakes its cost; open quotes have Refresh costs
- Material pulled onto a work order is valued at the cost recorded on the day it was pulled
- Sign quotes and work orders cost blanks, sheeting and film from the CRM's item costs (preferred price + freight); the workbook's 04 SIGN COSTS tab is only used when an item has no cost yet. Decal and lettering film use the item's cost too (11 VINYL only fills gaps)
- Files list: files on a vendor or an item show it under Attached to and Account

## 2026.11.25-56 — 2026-10-28
- Vendors: click a person's name to see all their details (title, location, email, phone, mobile, notes) with Edit and Make main rep — the main rep swaps into Details and the previous one moves to the People list

## 2026.11.25-55 — 2026-10-28
- Fixed: closing Show more on a file list left the page scrolled past the first 2 files (hidden under the pinned bar) — the list now closes with the first 2 files in view

## 2026.11.25-54 — 2026-10-28
- Lists read in three clear levels: small grey capital column labels, larger bold names, and a dark band for sections like Archived

## 2026.11.25-53 — 2026-10-28
- Table headings (Project, Stage, Value, Due, Billing…) are bolder and darker, all in the same style; the Archived divider uses exactly the same style as the headings

## 2026.11.25-52 — 2026-10-28
- Project details starts closed when the project has more than 4 lines (the line count shows on the title) — click the title to open it

## 2026.11.25-51 — 2026-10-28
- Column headings that sort (Project, Stage, Value, Due) look like the others — no all-capitals
- Account page: archived projects use the same bold project names and text as the active ones; the Archived divider is bolder

## 2026.11.25-50 — 2026-10-28
- Files and Sign pictures: only the first 2 show; the rest fold behind Show N more files (on projects, accounts, work orders and vendors — on an account the files from its projects fold the same way)

## 2026.11.25-49 — 2026-10-28
- Project tabs: before a work order exists the Close-out tab reads Schedule (there's no close-out yet)

## 2026.11.25-48 — 2026-10-28
- Account page: archived (closed and lost) projects are listed under the active ones, behind an Archived divider, newest first

## 2026.11.25-47 — 2026-10-28
- Projects and accounts open tidier: Field history always starts closed; Schedule starts closed when nothing is scheduled; Billing starts closed until there's something billed (project) or a billing contact / QuickBooks name (account) — click the title to open any of them
- Close-out only shows once a work order exists

## 2026.11.25-46 — 2026-10-28
- Fixed: the "N archived" button on an account did nothing — it now opens the Archive showing that account's closed projects

## 2026.11.25-45 — 2026-10-28
- Long notes (accounts, contacts, vendors, items) start folded: a two-line preview with Show all notes / Hide notes

## 2026.11.25-44 — 2026-10-28
- Calendar: tidy one-line items with a coloured tag (Start, Due, Late, Done, WO due, Shipped, event time) — nothing cut off mid-line, the full name on hover
- 3 items a day, then a quiet "+N more"
- today shown as a red date badge, weekends lightly shaded, finished items muted with a ✓ instead of crossed out, and a colour key above the month

## 2026.11.25-43 — 2026-10-28
- Fixed: files uploaded on a vendor (invoices, quotes, price sheets) were saved without the vendor and never showed — they now attach to the vendor and list in its Files card; the upload starts on the Invoice category

## 2026.11.25-42 — 2026-10-28
- Email, phone, mobile, website and address show with icons everywhere (accounts, contacts, vendors, billing, project contacts) and each one is a link: email, call, open the site, open in Maps
- Websites show as the plain address (ashcreekssd.utah.gov), on one line
- One even type scale: labels 12, secondary text 13, body 14, card titles 15; dates in the activity feed are plain text instead of code font; nothing on screen smaller than 11
- Header values (account, rep) the same size as the others
- Primary contact listed first on an account
- Menu: Our website link (streetsignsupply.com, opens in a new tab)
- Quote pictures: any line with an MUTCD code (on the line or in its description, like "1.1 R1-1 Stop") gets the public-domain MUTCD drawing from Wikimedia Commons by itself when the sign library and the website have no picture — checked in the background, and a code Commons doesn't have falls back to the plain drawing
- Vendors: People list — add each rep with their title, location/branch, email, phone and mobile (e.g. Grimco Las Vegas and Salt Lake)
- Vendor files card says "this vendor only"

## 2026.11.25-39 — 2026-10-28
- Menu: Sales now reads Accounts, Projects, Contacts

## 2026.11.25-38 — 2026-10-28
- Projects and Work orders open on the List view (Pipeline and the Status board are still one click away)

## 2026.11.25-37 — 2026-10-28
- Lists fit the screen: Contacts, Accounts, Projects, Vendors, Archive and the other wide lists wrap long names, accounts and emails instead of cutting off the right-hand columns

## 2026.11.25-36 — 2026-10-28
- PDF previews: when the CRM can't read a stored PDF directly, the card shows the PDF the way the file viewer does (the browser's own view of page 1)

## 2026.11.25-35 — 2026-10-28
- File cards: the buttons wrap onto a second line so Delete is never cut off (Delete still asks first and moves the file to the bin)
- PDF files show a picture of their first page instead of the word PDF

## 2026.11.25-34 — 2026-10-28
- Fixed: the website could stay on the Sign in screen even when you were already signed in (the sign-in finished a moment after the page loaded). It now keeps checking for a few seconds and opens by itself

## 2026.11.25-33 — 2026-10-28
- Rebuilt on 2026.11.25-32 — today's -31 push had replaced -32 on the website with an older build
- everything in -32 is back
- The sheet feed never brings back an account, project or note that was archived on purpose
- Data clean-up (Matt 10/28): 620 accounts that were never contacted, and their 90 contacts, moved to Archive — they stay on the SSS Pipeline sheet Prospects tab and can be restored from Archive

## 2026.11.25-32 — 2026-10-28
- Invoiced projects use the sales tax QuickBooks actually charged (recorded on the project) instead of the estimate — P-2008 and P-2009 had no tax on their QuickBooks invoices

## 2026.11.25-31 — 2026-10-27
- Sign-in: with no sign-in, the CRM never falls back to owner access — the website shows only the sign-in screen, and typed initials no longer grant anything once the owner has claimed their record
- Tax: an account marked exempt with no certificate expiry date now bills taxable (shown as Taxable · add cert date) until the date is entered
- Work order progress bar: QC is checked only when QC was actually signed off — otherwise it reads "not signed off"
- Shipped work orders show the ship date instead of "late"
- Vendors list fits the screen (long terms and contacts wrap)
- an unnamed vendor shows "Unnamed vendor — add a name"
- Automatic tasks (chase the proof, quote follow-up) go to the project's rep, else the account's rep, else the owner — never unassigned
- Order sync: Send all also marks deleted and merged accounts, contacts, projects and work orders as deleted on the sheet
- rep, billing status, invoice and paid dates, tracking, project value and the other CRM fields ride along on a "CRM fields:" line in Notes
- Fix runs: start by hand only (never on a push), never run the same fix twice, a run the watchdog stops is reported as failed with what finished, and every fix edit is tagged "Fix run" in Field history

## 2026.11.25-30 — 2026-10-27
- Items can have more than one vendor: the existing Vendor stays as the preferred one (gets the reorder email)
- add others with their cost, part #, last bought date and where the price came from (invoice or quote)
- Item page: new Vendors table with Cost, Part #, Last bought, Source, Make preferred and Edit, and a Lowest cost tag
- Vendor page: What we buy from them lists every linked item with that vendor's cost, plus Link an existing item (search and pick)
- Vendors list and the vendor Items count include every linked item
- Changes go to Field history on the item and the vendor
- Costs and the edit buttons stay hidden for Sales and Shop
- Fixed: prices and costs showing as — on the hosted site — a sign-in that isn't linked to a team record now gets a Limited view banner with Link my sign-in, one person can link more than one sign-in (inside Claude and on the website), and a site with no sign-in no longer locks everyone to Shop
- Costs typed as $1,234.50 now read as numbers
- No Firestore rules change — new fields only, existing records unchanged

## 2026.11.25-29 — 2026-10-27
- Work order status shown as one progress bar: done steps checked, the current step red, the rest grey
- Items to make fits the screen — size and code under the name, grade and substrate together, short overlaminate note
- No laminate wording no longer repeated
- work order details say no laminate when declined

## 2026.11.25-28 — 2026-10-27
- Work order: one-click No laminate (customer declined) on the Production route, and Put the laminate back
- the overlay checklist item stops nagging when declined
- Change route renamed Edit work order
- work order history names every checklist item (no more undefined)

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

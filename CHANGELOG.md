# What changed

## 2026.11.25-96 (cost fixes, round 3)
- Stop signs are costed on the octagon, not the square: sheeting (and any clear or legend film) is 82.8% of the square, and the stop takes the octagon blank of its size (BLK-…-O). Red ink stays at what was measured on a 30" stop — $1.54 (567 sq in of red = 76% of the octagon).
- Signs on the cost sheet (handicap R7-8, R7-1 and the rest) cost their base sheeting as face area × the film waste (1.10), the same as every other sign of that size — not the workbook's roll layer (2.0 sq ft on a 12x18).

## 2026.11.25-95 (cost fixes, round 2)
- Signs are costed as printed by default: blank + white/base sheeting + HP latex ink at $0.39/sq ft on 63% of the face. A sign line's "Legend" choice can be set to "Legend: cut EC film (small order)" — then the EC film layer is costed instead of ink (the line's legend colours, or one EC colour at the default coverage when none are picked).
- Stop signs (R1-1) are costed as white sheeting of their grade (DG3 White 4090 for DG3) plus red ink at 63% — about $1.54 for a 30x30 — never red sheeting. Cut by hand, the red is EC red film.
- A bare blank whose line says "extruded" is costed from the extruded blade blank of its size (BLK-EXT-…), not a flat .125 blank.
- Costs and prices → Signs on the cost sheet: "Costs us today" is worked out from today's item costs, the same way a quote line is (printed or cut film shown), next to the workbook's cost; the price shows as text, with the target-margin price when the workbook has none.
- Costs and prices → Materials: cost per unit, sq ft per unit and price show as text above their edit boxes; cost per sq ft only for things sold by area (posts and hardware show —).

## 2026.11.25-94 (stencils: how they're measured)
- Stencils page opens with "How stencils are measured": two drawings and plain rules — the size in the name is the painted image (letter height for alphabet and number kits; height × width when there are two numbers), the sheet is bigger to catch overspray, kits are one character a piece.
- Every stencil's card has its own measurement drawing: the sheet with its width and height, the painted letter or area inside it with its size, plus letter height / painted size, sheet size (each piece on a kit), pieces and sq ft in words. A catalog sheet smaller than the painted size is marked "check".
- The list shows what each stencil is ("Kit of 38 pieces", "One stencil", "One piece — a single shape, not the whole alphabet"), separate Painted size and Sheet columns, and the price a piece on kits. Clicking the name opens the card.
- The playground shape pieces named "… Alphabet Stencil" (hexagon, circle, square, triangle, star, double dot) are marked as one shape, with a pointer to the full Shape Alphabet or an alphabet kit.
- Find an item shows a stencil's kit size and painted size instead of the sheet size.

## 2026.11.25-93 (Josh's cost audit)
- Grade wording: "3M Engineering Grade Reflective", "High Intensity…", "Diamond Grade…" now find their sheeting (EG 3430, HIP 3930/3931, DG3 4090/4091) — the sheeting is costed instead of $0.
- Blank gauge comes from the line itself (substrate, then the description/grade/note: ".063", ".125"…); otherwise .080, and .063 for 12x18. A .125 blank is used only when the line names it; with no blank of that gauge it picks .080 before .125.
- A sign with a missing part (no blank of its size, sheeting that doesn't match, or an item with no cost) is no longer costed at what's left: the line shows a red "missing: …" pill, a warning lists it above the quote lines, and it's kept out of the margin.
- Overlaminate is off unless the customer asks: the line's box is now "Add clear overlaminate"; accounts can be set to want it on new lines. The quote PDF's overlaminate sentence only appears when a line has it.
- HP latex ink is costed on printed signs: $0.39 per sq ft on 63% of the face (≈ $1.54 per 30x30 stop), both set in Settings → Pricing. Cut-film legends get no ink.
- Film waste stays at 10%.

## 2026.11.25-92
- Emails sent from the CRM carry the sender's own Gmail signature (read from their Gmail settings), sent as a proper HTML email like Gmail's own. The compose screen shows the signature under the message; templates and AI drafts end with "Thanks," so the name and phone aren't doubled.

## 2026.11.25-91
- AI drafting on the website: "Write it with AI" in the email screen. The mail worker writes the draft with GitHub's free AI models (no key, no bill) in about 10–30 seconds, in the shop's plain voice; type what it should say, or leave it to the subject and the project. The in-Claude copy keeps using Claude.

## 2026.11.25-90
- Quote + proof, one signature: "Get it signed" offers Quote + proof (the default when there's both). The customer page shows the quote items and totals, then one tile per piece of artwork (size, sheeting, colors, qty) with its own Approve / Needs change and note; hardware, freight and lines with no artwork are listed as "No artwork needed". Signing is blocked until every piece is set; any "Needs change" turns the button into "Send change requests". Optional PO number (goes on the project). Proof revision shown; a newer link replaces the old one, which points to it. Full name isn't prefilled; "on behalf of" only for organizations; PDF row says Quote PDF or Proof PDF. "What happens next" at the bottom.
- After signing: stage moves to Won, the proof is marked approved on the open work orders, a signed PDF (quote + artwork + signature) is saved to Files, it's logged in Activity, and the rep and the owner get a bell notice and an email. Opening the link is logged too.
- The mail worker stays on: emails go out within about a minute of Send (no more "sending…" for 10+ minutes). Customer emails from Gmail are logged on the project when the subject has its P- or quote number (else the contact's latest open project). A quote emailed from Gmail with its PDF starts the follow-ups.
- Follow-up timers start when the quote is actually sent (from the CRM or Gmail), not when it's marked quoted or the PDF is made.
- Tasks: your own tasks ring the bell and email you too; assigning to someone with no email says so; My tasks (overdue / today / this week / later) on every dashboard; a 7 AM email with what's due; one email when a task goes overdue, to the person and whoever assigned it.
- Dates: one named set on the project — Received, Quote due, Customer needs it by, Ship / install (from the work orders). A work order shows the project's needs-by date and has its own Production start and Ship / install date. The calendar shows Quote due, Customer needs it by, Ship / install and Shipped (no "Start"), once per job, with a legend.
- Quote table Total row margin matches the header (lines with no cost left out). Dashboard win rate counts lost projects the same way Reports does. Test projects (TEST / do not send in the name) stay out of dashboards, reports and the forecast.
- Quote PDF: a line with no picture gets the sign drawing or no box (never a grey square). A sign line with no grade blocks the quote until the grade is picked.
- Price source shows on every priced line ("typed" when nothing else matches). Proof lines say "Sign face color: White". Projects list rows are real links. Stencil kits rank below signs in Find an item unless you search for a stencil.
- Sent emails show the address they went to.

## 2026.11.25-89
- The customer signing page is redesigned: letterhead with the logo, quote number and date; who it's for and from; each item with its picture, clean name, size and grade; charges and totals laid out like the PDF; the PDF as a tidy link (no cut-off preview); a proper signature pad; on a phone, a bar with the total and a jump to Approve. Signed copies print as a clean record.
- Proofs can be signed too: choose "The proof" in Get it signed — the page shows every artwork picture numbered, with its line, tap to enlarge. No PDF needed.

## 2026.11.25-88
- Times of day (sent, logged, history, notes saved) always show in Mountain time, whatever time zone the computer viewing the CRM is set to — a browser set to Arizona or standard time showed them an hour early. Emails logged from Gmail get the Mountain date too (not the UTC date after 6 PM).

## 2026.11.25-87
- Signature links now point to https://ssc-crm-a7224.web.app/sign.html — the signing page is hosted with the CRM, nothing to upload.
- Email sending and Gmail logging are connected (sending from each person's Gmail; customer emails logged every 10 minutes).

## 2026.11.25-86
- Email from the CRM: one compose screen (Drafts → New email…, any email address in the CRM, Send on a draft or follow-up). Pick who it goes to, start from a template (send the quote, follow-up, proof, shipped, invoice, thank-you — or your own saved ones), have Claude write it (in-Claude copy), attach files from the project, and Send. Once Google Workspace delegation is on (Settings → Sending email), Send goes out from the person's own @streetsignsupply.com Gmail within 10 minutes and shows "sent" on the activity; until then it opens in your own email and is logged.
- Gmail is read every 10 minutes (once delegation is on): every email to or from a CRM customer is logged on their account automatically, marked "Gmail".
- Task notices are actually emailed (by the same mail worker).
- E-signature: Drafts → Get it signed… makes a private link (30 days) to a page where the customer reads the quote or proof, types their name, draws a signature and approves — or asks for changes. The project's Signatures card shows waiting / opened / signed, with Mark won and Save to Files; whoever sent it gets a bell notice and an email.
- Proofs: customer reference photos no longer print as artwork (the count now says "pictures"); ".063 aluminum" keeps its space; the revision number only goes up when the lines or pictures change, not each time it's opened.
- ".063 aluminum" never matches the .080 blank (a thickness on the line has to match the item's).
- Find an item leaves stencil sheet stock out of sign searches (type stencil, LDPE or HDPE to see it).
- Saving Settings no longer drops settings that screen doesn't show (stage chances, goal, templates, stencil settings).

## 2026.11.25-85
- Quote and invoice PDFs no longer print "About this project" — that's for the team only. Projects have a separate "Scope on the quote / invoice" box (Edit the project); only that prints as Scope.
- Reports: a project closed lost counts as lost even when its stage log has no "lost" entry (win rate was showing 100%). Receivables aging shows the CRM account on the project that carries the invoice (QuickBooks' customer name in brackets when it differs). The Open quotes card also shows the whole open pipeline, which is what the dashboard's "Open pipeline" counts.
- New Tasks page (Sales → Tasks): Mine, Everyone's open, Overdue, Done lately.
- Accounts: tick accounts to set the rep, type or terms on all of them at once (each goes in the account's history) or export them; names are real links (open in a new tab). Every column header sorts — they now show ↕.
- Change history: filter by kind of record, who, when, and people vs fix runs.

## 2026.11.25-84
- Lines saved before price sources were recorded, whose price matches nothing today (price list, website, their price), say "earlier price" instead of "typed".

## 2026.11.25-83
- Margin is worked out only from lines that have a cost, everywhere (project page, gate, dashboards, reports). A sign line with no cost no longer counts as 100% margin; the project page says how many lines were left out.
- Find an item: searching "stop" puts R1-1 Stop first. Workbook rows read "Stop here for pedestrian sign" (size and grade underneath) instead of the raw "30X30 … DG3 .080|30X30", and workbook titles no longer show up as fake sign codes.
- Every priced line shows where its price came from — older lines too (their price, website, price list, cost + margin, typed).
- Street name blades (D3 code, "blade", or a 6–9" tall blade with a street's name) show as "Street name sign" on the project, work orders and reports.
- Making a quote with a sign line that has no grade stops and lists the lines; if you carry on, the PDF says "sheeting grade to be confirmed" on them.
- Add a line: the price follows the suggestion as the quantity changes (quantity breaks apply, also to a price picked from the price list or website) until you type your own price.
- Inventory: items with a placeholder reorder point (reorder at 1, order 1) are flagged, with a "Set reorder points" screen to put the real numbers in (shows each item's average monthly use).

## 2026.11.25-82
- Reports is rebuilt. One date range and rep filter at the top apply to the whole page (inventory has no rep). Owner snapshot: revenue this month, weighted 90-day forecast, open quotes, receivables, inventory at cost, low stock, overdue follow-ups.
- Every report has a chart on top, the detail table below, Export CSV (the same rows and totals as the table) and click-through: a bar, slice or row opens the projects, items or work orders behind it.
- Forecasting: weighted pipeline by expected close month and stage (stage chances editable, saved for everyone), revenue vs a monthly goal with run rate to year end, win rate and days quote-to-PO by customer type (won / lost / gone quiet), seasonality year over year.
- Reps: scorecard and leaderboard (quotes, $ quoted, $ won, win rate, average deal, margin, overdue follow-ups) with a 6-month trend; activity (emails logged, new accounts, hours to first reply).
- Inventory: value at cost by category, low stock for purchasing (average monthly use, days of cover, vendor; reorder points of 1 with no use are flagged as placeholders), slow movers (90+ days), committed material for open work orders vs on hand.
- Margin by job, product and customer counts only lines that have a cost (an uncosted line no longer reads as 100% margin); jobs under the margin floor are flagged.
- Quoted vs invoiced and receivables aging come from QuickBooks: the morning QuickBooks check now leaves a copy of the invoice list in the CRM (owners and office only). Also: top customers with reorder alerts, lost-quote reasons, production and on-time, lead source → reply → quote → win, bid calendar.
- Closing a quote as lost now needs a reason.
- The old group-by report is still there at the bottom ("Build your own report").

## 2026.11.25-81
- Saving a quote or invoice PDF only replaces PDFs the CRM made for that same number — never a signed quote, PO or anything uploaded. If it can't go into Files you're told. "PDF saved" goes in the history only when it's actually saved (not on the preview).
- Files: when a project has several quote (or invoice) PDFs, the newest says "Current" and the others "Older version".
- The material matcher no longer matches on a thickness alone (".063 aluminum" isn't ".063 LDPE"), and a material named on a line (aluminum, LDPE, HIP…) has to be the item's material.
- Notes, calls and emails can be edited or deleted (⋯ on the entry) by owners, office and whoever wrote them; the change goes in the record's history.
- Inventory items have a picture (link or upload). Quote lines for that item — posts, anchors, hardware — show it, and so do quote PDFs.
- Reminders go to the sheet once per reminder (not once per team member).
- Street name blades are called "Street name sign" on work orders.
- Cancel stays Cancel after you've typed: a separate "Throw away what you typed? Keep editing / Discard" appears on the left.
- Quote lines: each price says where it came from (price list, website, their price, cost + margin, typed). Hardware lines show "—" for grade instead of repeating the name. Long line notes are a one-line badge (full text on hover). On screens up to 1100px the grade is shortened and the ↑↓ buttons step aside so Edit stays visible.

## 2026.11.25-80
- Quote and invoice PDFs: when you save one, it also goes into the project's Files, and any older PDF of the same quote or invoice number moves to the recycle bin — no more two different Q-1015s side by side.
- Quote lines with no picture (posts, anchors, bolts, custom items) have a "+ Photo" button: add a link or upload a picture once and every quote with that item uses it.

## 2026.11.25-79
- Work orders: blanks can come from different places on the same job. Pick "Mixed — choose for each line" under Blanks and each line gets its own choice (pull from stock, on order from a vendor, or cut in-house). It starts each line on stock when there are enough on the shelf and on "on order" when there aren't, and shows what's on hand. Each work order line can also be changed later ("Blanks for this line").
- A mixed work order pulls only the stock lines from inventory, marks the ordered blanks "on order", lists which lines are waiting on blanks, and its route has both "Blanks received from vendor" and "Pull blanks from stock".
- Sign pictures: a line whose words match a website sign in any order (e.g. "Fire Lane No Parking" = the website's "No Parking Fire Lane Sign", arrows pointing the same way) shows that website picture. Only a sign that isn't on the website gets a drawing.

## 2026.11.25-78
- Parking and fire-lane sign drawings look like the real signs: white face, red border, the legend in big red capitals one word per line ("FIRE / LANE / NO / PARKING / ANY / TIME"), each phrase sized to fill the sign, so they're readable even as a small thumbnail.

## 2026.11.25-77
- Quote prices come from the right list for the customer. Each account has "Quote prices from": automatic (retail customers → website prices; contractors, government and resellers → your price list), or set it to price list or website. A website item picked for a price-list customer is priced from your price list for that size and material. The Add a line form says where the price came from and shows the other one beside it ("website $30.89 · use").
- The line form breaks the cost down by part — blank, sheeting, legend, overlay, overlaminate, ink — when it's worked out from materials (a locked cost shows today's breakdown under it).
- Parking and fire-lane signs with no picture anywhere get a plain drawing with their own words in red (the agents still replace it with a real picture).

## 2026.11.25-76
- Phones (and narrow windows, up to 760px): quote lines show as cards — the item across the top, the numbers in two columns, and Edit always on screen; long material names show short (e.g. "DG3 White") with the full name on hover. Tables stack, the labelled bottom menu shows, and the breadcrumbs become one "← Back" link.
- "A newer version of the CRM is ready" is a small note in the bottom-right corner, and it never shows over an open form.
- Risky buttons moved away from everyday ones: re-pricing and changing the grade on every line are under "Bulk actions" on the quote lines (each opens a screen to check first); Discard on a draft and Merge in Possible duplicates are in "⋯" menus and ask first.
- "Not yet" on the quote lines' work order column is grey, "not on a work order" counts are amber, and cards that need attention have an amber border instead of red (red is for real problems).
- Projects: one Import menu (website orders, pipeline feed). Projects and Work orders view switches look like tabs.
- Dashboard: My accounts shows the top 8 by open value with "See all"; the monthly charts leave out empty months.
- Files: the Account column no longer repeats the vendor. Vendors: terms stay on one line (full text on hover). Contacts: a note in brackets after a name shows under the name. Phone numbers don't wrap.

## 2026.11.25-75
- Find an item: results read cleanly (no "|24X12" keys on the end) and rank better — the exact code first, then names that start with what you typed, then whole words; "DOES NOT STOP" signs come after real stop signs.
- Phones: small grey notes are 13px and darker. Files list: "by Jarom S." under the date instead of bare initials.
- File tiles: the "⋯" menu (with Delete) opens upward and isn't cut off by the tile.

## 2026.11.25-74
- Quantity boxes on the quote line and work order line forms take 1 or more only: a red note shows under the box while it's 0, negative or blank, and Add/Save refuse it.
- A price picked from the price list stays the suggested price until you change the code, size or material (the account's own price still comes first).
- Typing a code never replaces a name or size you typed yourself — it only fills them when they're empty or were filled in by the form.
- Project header: under the margin it says how many lines sell below cost.
- Files: the delete is in a "⋯" menu on each file instead of a trash icon beside Open.

## 2026.11.25-73
- Add a line: the Find box works on the live site. Any form left open no longer gets redrawn when new data arrives in the background — that was wiping its live search and re-pricing (and anything being typed).
- A price that came from a picked item is dropped as soon as the code, size or material is changed by hand, and the line re-prices from the new details (a price you typed yourself stays).
- Typing a code fills the name (unless you wrote your own) and switches the size to that code's usual size when the current one isn't one of its sizes.
- One entry per code (workbook codes like "R1-1|30X30" are R1-1), and one entry per material (roll widths aren't separate materials).
- Editing a line needs a quantity of 1 or more. The work order line form uses the same single searchable boxes (no "Pick a…" dropdowns or "Click the box" text).
- Project header: Cost and margin are worked out the same way as the Quote lines table, so they agree; material pulled so far shows under it.
- "Nobody on this project" only shows when the account has no contact either (proofs and invoices go to the account's main contact).
- Archive: the row "⋯" menu opens instead of the project. More of the gray helper text is tucked behind the "?" buttons (or Help → Show the long explanations).

## 2026.11.25-72
- Settings → Data: "Turn the lock off" is under More and asks you to type off. It used to be a plain button beside "Apply the updated rules" and turned the lock off with one click.

## 2026.11.25-71
- Contacts "Possible duplicates" only lists real look-alikes: the same email, or the same person's name (department names like "Bids" or "Purchasing" only count on the same account). It was listing 196 pairs.

## 2026.11.25-70
- Quote "Add a line" is shorter: one "Find an item" box (codes, your workbook, the website, stencils and inventory — pick a result and the name, code, size, material and price fill in), then Quantity (starts at 1), What to call it, Price each, and one line with the cost, the margin and a single "Use suggested price" button. Code, size and material are behind "Change details" as single searchable boxes; how it's made, legend colours, overlaminate, saving the account's own price and the note are under "More options".
- One suggested price: the account's own price, else your price list / workbook / website (never under the quote floor), else the cost at your target margin. The second "use $X" from the cost formula is gone.
- Typing a code fills the name and usual size just like picking it, the sizes list follows the code, and an unknown code is flagged. Each code appears once. The material list only shows sheeting, vinyl, films, banner and magnet stock.
- A quantity is required to add a line. On a phone the form is one column with 16px boxes and Cancel/Add stay at the bottom.
- Quote lines that sell below cost show "⚠ −22% below cost" and a warning above the lines.
- Contacts: a "Possible duplicates" list (same name, email or phone) with Merge, and "Merge with another contact…" under More on each contact.
- Archive: Delete on each row and "Delete all shown" are inside menus, and each asks you to type delete.
- Less red: account icons and section marks, link hovers, stage labels and today's date use blue or slate; red is for the logo, alerts, overdue, low stock and deleting. Secondary text is darker.
- Database rules (offered for Apply in Settings → Data): change history is add-only (nothing already there can be edited); accounts and contacts can't be changed by the shop; the shop moves work orders along but can't create them or change their lines; stock moves can only be added or undone; the CRM can only email people on the team; number counters only go up; people can record only their own sign-in id; the shop key can't go back into the open settings record. History saves retry if two people add at once.
- The backup restore is its own workflow that only runs when started by hand, and each change it makes goes into the record's history with the run number and the values it replaced.

## 2026.11.25-69
- Calmer colors: buttons, links, selected tabs and the stage steps use blue; red is kept for warnings, overdue and the logo.
- One primary (blue) and one secondary (outline) button style; the yellow and brown one-off buttons now use those.
- Delete is no longer beside everyday buttons: on accounts, contacts, work orders, vendors and items it is under "More"; file tiles show a small trash icon instead of a Delete button.
- Text on screen is never smaller than 12px (calendar entries, menu headings, small notes).
- Files: the "Added" column shows the date and who added it without wrapping. Contact roles and emails no longer wrap.
- Calendar days show up to 4 entries before "+N more"; your own events are purple so they don't look like start dates.
- Inventory: items with none on hand read "0 sheets" without the "0 sq ft".
- Work order back button reads "← P-2008" (full project name on hover), so it no longer runs past the header.
- Side menu: Stencils and Purchase orders sit under Inventory and appear when you're in that section, so the menu is shorter.

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

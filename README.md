# Longlife Hospital — Care System

The public site and staff portal for **Longlife Hospital**, No. 22 Owoseni Street,
Oshodi, Lagos. Plain static files: no build step, no server, no dependencies.

Open `index.html` in a browser, or use the hosted copy published by GitHub Pages
from the `main` branch.

## What is in here

| File | What it is |
| --- | --- |
| `index.html` | Page shell — loads the stylesheet and the two scripts |
| `longlife-hospital.css` | Design tokens and every component style, light and dark |
| `longlife-data.js` | Store, models, role permissions, seed data, derived queries |
| `longlife-app.js` | Hash router, views, modals, command palette |
| `tools/build-single-file.js` | Inlines everything into one HTML file for hosting elsewhere |
| `phone-number-checker.html` | Standalone Nigerian phone number validator and network lookup (see below) |
| `location-share.html` | Standalone consent-based live location sharing (see below) |
| `accessnet-investment-proposal.html` | Unrelated earlier document, kept for reference |

## The public site

- Hospital home page — services, facility record and contact details
- **Cost estimate** (`#/quote`) — a patient ticks the services and medicines they
  need, sees an itemised total, then prints it or emails it to themselves

## The staff portal

Sign in at `#/login`. Four roles, each with its own navigation and permissions:

| Role | Username | Can do |
| --- | --- | --- |
| Nurse | `nurse.ada` | Register patients, issue cards, record vitals, bill services |
| Doctor | `dr.adeyemi` | Write prescriptions, review history, bill services |
| Pharmacist | `pharm.grace` | Dispense prescriptions, receive stock, manage the catalogue |
| Admin | `admin` | All of the above plus finance, records and the audit trail |

Every demonstration account uses the PIN `1234`.

### How the work flows

1. The nurse issues a **patient card** — the card number, fee and expiry are generated
   automatically and the card can be printed.
2. The doctor writes a **prescription**, which lands in the pharmacy's dispense queue.
3. The pharmacist dispenses it in one action: stock is deducted, the drugs are priced,
   they are billed to the patient's card and the prescription is closed.
4. Everything the patient received shows on their record with the date, dosage,
   quantity, price and who dispensed it.
5. The admin sees **finance**: what has been billed, what has been received, what is
   still owed, what has been spent, and every payment and expense record.

### Automation

Auto card and receipt numbers, expired-batch and insufficient-stock dispensing guards,
low-stock and expiry alerts, a generated reorder list, an audit trail of every action,
a command palette (<kbd>Ctrl</kbd>+<kbd>K</kbd>) and CSV export throughout.

## Nigeria phone number checker

`phone-number-checker.html` is a separate, self-contained tool — unrelated to the
hospital app, open it directly in a browser. Given a Nigerian phone number (any of
the common formats: `0803...`, `+234 803...`, `234-803-123-4567`, etc.) it:

- validates the format and normalises it to local (`0803...`) and international
  (`+234803...`) form
- looks up which operator (MTN, Glo, Airtel, 9mobile) the number's prefix was
  originally allocated to by the NCC
- supports checking a pasted list of numbers at once and exporting the results as CSV

Everything runs client-side in the browser; no number is ever sent anywhere. It only
identifies format and original network from public NCC prefix allocations — it does
**not** and cannot show a number's location, call history, or online status. That
data is held exclusively by telecom carriers under lawful-intercept rules, and a
tool that tried to expose it for arbitrary numbers would be stalkerware, not a
utility. Note also that because of mobile number portability, the operator shown is
the number's original allocation and it may since have moved to another network.

## Consent-based location sharing

`location-share.html` is another separate, self-contained tool — open it directly in
a browser, unrelated to the hospital app or the phone checker. It lets one person
request another person's live location, but **only with that person's explicit,
in-the-moment consent**:

1. The requester opens the page, optionally labels the request (e.g. "so I can find
   you at the market"), and gets a link. They send that link themselves — the tool
   has no messaging integration and can't contact anyone on its own.
2. The other person opens the link and sees exactly who's asking and why, with two
   buttons: **Share my location** or **Decline**. Nothing is sent until they tap Share.
3. If they share, their browser's native geolocation prompt fires, and their position
   updates live on the requester's page for as long as they keep that tab open. A
   **Stop sharing** button is always visible, and closing the tab stops it too.

There is no way to look up a phone number's location without the number's owner
personally opening the link and agreeing — that's a deliberate limit, not a
missing feature.

**Backend:** a handful of Postgres functions in the `naija_location_share` migration
of the `naija-location-share`-labelled tables in the existing Supabase project
(table `naija_location_requests`). The table has Row Level Security enabled with
*no* policies — direct table access is blocked entirely for every role — so the
only way in is through five narrow `SECURITY DEFINER` functions
(`naija_location_create_request`, `naija_location_get`, `naija_location_update`,
`naija_location_decline`, `naija_location_stop`), each scoped to a single request id.
Rows older than 24 hours are deleted automatically the next time a request is
created, so nothing accumulates indefinitely. This is fully isolated from every
other table in that Supabase project — nothing about the ISP platform's own schema
was modified to add it.

## Setting your own prices

The service tariff used by the cost estimate and by service charges lives in the
`services` array in `longlife-data.js`. The prices there are placeholders — replace
them with the hospital's real tariff. Drug prices come from the pharmacy catalogue and
are edited in the portal.

## Important limitation

**This is a demonstration system.** All data is stored in the browser's `localStorage`
on each device, and the PIN check is a role switch rather than real authentication —
PINs are stored in plain text and anyone using the browser can read or change the data.
Nothing is shared between devices or staff members.

Before it holds real patient records it needs a server, a database, real
authentication, and handling that meets Nigerian health-records requirements.

## Hospital details

The facility details on the site were taken from the hospital's own website and
Nigerian hospital directory listings: established 5 January 2005, registered as a
Primary Health Care Centre with the Nigeria Ministry of Health (facility code
24/18/1/2/2/0021), open 24 hours every day. They live in the `HOSPITAL` object at the
top of the public-site section of `longlife-app.js` — correct them there if anything
has changed.

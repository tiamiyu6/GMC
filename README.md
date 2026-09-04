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

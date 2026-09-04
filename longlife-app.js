/* ==========================================================================
   Longlife Hospital — Care System UI
   Hash router, role-aware views, modals, command palette and toasts.
   Depends on longlife-data.js (global `LL`).
   ========================================================================== */

(function () {
  "use strict";

  const root = document.getElementById("root");
  const esc = LL.esc;
  const money = LL.money;

  let state = { modal: null, palette: false, paletteSel: 0, rxItems: [], quote: {}, quoteNo: null };

  /* ---------- icons (inline, currentColor) ---------- */

  const ICONS = {
    dashboard: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z"/>',
    patients: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    rx: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6"/>',
    queue: '<path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17"/>',
    pharmacy: '<path d="M4 7h16M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7M9 7V4h6v3M12 11v6M9 14h6"/>',
    reports: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
    audit: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4"/>',
    stethoscope: '<path d="M6 3v6a6 6 0 0 0 12 0V3M18 3h2M4 3h2M12 15v2a4 4 0 0 0 8 0v-2M20 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
    baby: '<path d="M9 12h.01M15 12h.01M10 16s1 1 2 1 2-1 2-1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/>',
    lab: '<path d="M9 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V3M8 3h8M7 14h10"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
    surgery: '<path d="M14 4l6 6-9 9H5v-6zM3 21h18"/>',
    emergency: '<path d="M12 2l9 16H3zM12 9v4M12 16h.01"/>',
    pin: '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7"/>',
    clock: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    search: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35"/>',
    cash: '<path d="M2 6h20v12H2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 9h.01M19 15h.01"/>',
    quote: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h3"/>'
  };

  function icon(name, size) {
    const p = ICONS[name] || "";
    const s = size || 18;
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }

  /* ---------- toasts ---------- */

  function toast(message, kind) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = `<span class="bar"></span><span>${esc(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .25s ease";
      setTimeout(() => el.remove(), 260);
    }, 3800);
  }

  /* ---------- routing ---------- */

  function currentRoute() {
    const h = location.hash.replace(/^#/, "") || "/home";
    const parts = h.split("/").filter(Boolean);
    return { parts, path: "/" + parts.join("/") };
  }

  function go(hash) {
    location.hash = hash;
  }

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", route: "#/app/dashboard", perm: "dashboard" },
    { key: "patients", label: "Patients", icon: "patients", route: "#/app/patients", perm: "patients" },
    { key: "prescriptions", label: "Prescriptions", icon: "rx", route: "#/app/prescriptions", perm: "prescriptions" },
    { key: "queue", label: "Dispense Queue", icon: "queue", route: "#/app/queue", perm: "pharmacy.dispense" },
    { key: "pharmacy", label: "Pharmacy Stock", icon: "pharmacy", route: "#/app/pharmacy", perm: "pharmacy.view" },
    { key: "finance", label: "Finance", icon: "cash", route: "#/app/finance", perm: "finance" },
    { key: "reports", label: "Reports", icon: "reports", route: "#/app/reports", perm: "reports" },
    { key: "audit", label: "Audit Trail", icon: "audit", route: "#/app/audit", perm: "audit" }
  ];

  function render() {
    const r = currentRoute();
    const user = LL.currentUser();

    if (r.parts[0] === "app") {
      if (!user) { go("#/login"); return; }
      root.innerHTML = shell(user, r);
      wireChart();
    } else if (r.parts[0] === "quote") {
      root.innerHTML = viewQuote(user);
      paintQuote();
    } else if (r.parts[0] === "login") {
      root.innerHTML = viewLogin();
      const f = document.getElementById("loginUser");
      if (f) f.focus();
    } else {
      root.innerHTML = viewHome(user);
    }
    if (state.modal) renderModal();
    window.scrollTo(0, 0);
  }

  /* ---------- public home ---------- */

  const HOSPITAL = {
    name: "Longlife Hospital",
    address: "No. 22 Owoseni Street, Oshodi, Lagos",
    lga: "Igbehinadun A, Oshodi/Isolo LGA, Lagos State",
    phones: ["0703-372-1219", "0817-555-0930"],
    email: "longlifehospital97@gmail.com",
    established: "5 January 2005",
    facilityCode: "24/18/1/2/2/0021",
    registration: "Primary Health Care Centre — Nigeria Ministry of Health"
  };

  const SERVICES = [
    { icon: "stethoscope", name: "General Clinic", desc: "Day-to-day consultation and treatment for walk-in and returning patients." },
    { icon: "baby", name: "Maternity & Antenatal", desc: "Antenatal care and delivery services for expectant mothers." },
    { icon: "lab", name: "Laboratory", desc: "Comprehensive laboratory testing to support diagnosis on site." },
    { icon: "scan", name: "Scan Services", desc: "Diagnostic scanning available within the facility." },
    { icon: "surgery", name: "Surgery", desc: "Surgical care delivered by the hospital's clinical team." },
    { icon: "emergency", name: "24/7 Emergency", desc: "Emergency response every hour of every day, including public holidays." },
    { icon: "pharmacy", name: "Pharmacy & Dispensary", desc: "In-house pharmacy dispensing against doctors' prescriptions, tracked on the patient's card." }
  ];

  function siteNav(user, page) {
    return `
    <header class="site-nav">
      <div class="inner">
        <a class="brandmark" href="#/home">
          <span class="glyph">LL</span>
          <span class="word">Longlife Hospital<small>Oshodi · Lagos · Est. 2005</small></span>
        </a>
        <nav class="links">
          ${page === "home"
            ? `<a href="#services" class="hide-sm">Services</a>
               <a href="#facility" class="hide-sm">Facility</a>
               <a href="#contact" class="hide-sm">Contact</a>`
            : `<a href="#/home" class="hide-sm">Home</a>`}
          <a href="#/quote" class="${page === "quote" ? "on" : ""}">Get an estimate</a>
          ${user
            ? `<a class="btn sm" href="#/app/dashboard">Portal · ${esc(user.name.split(" ")[0])}</a>`
            : `<a class="btn sm" href="#/login">Staff login</a>`}
        </nav>
      </div>
    </header>`;
  }

  function siteFooter() {
    return `
    <footer class="site-foot">
      <div class="inner">
        <span>© ${new Date().getFullYear()} ${esc(HOSPITAL.name)} · ${esc(HOSPITAL.address)}</span>
        <span class="mono" style="font-size:11.5px;">Demonstration system · data stored in this browser only</span>
      </div>
    </footer>`;
  }

  function viewHome(user) {
    const t = LL.totals();
    return `
    ${siteNav(user, "home")}

    <section class="hero">
      <div class="inner">
        <div class="eyebrow">Licensed Primary Health Care Centre · Lagos</div>
        <h1>Care that does not close.</h1>
        <p class="lede">
          Longlife Hospital has served Oshodi since 2005 — a fully licensed private facility
          running clinic, maternity, laboratory, scan, surgery and emergency services
          every hour of the day, with an in-house pharmacy that dispenses straight onto
          the patient's own card.
        </p>
        <div class="cta-row">
          <a class="btn" href="#/login">${icon("logout", 17)} Staff portal login</a>
          <a class="btn ghost" href="#services">See our services</a>
        </div>

        <div class="facts">
          <div class="fact">
            <div class="k">Established</div>
            <div class="v">5 Jan 2005</div>
            <div class="s">${new Date().getFullYear() - 2005} years of service</div>
          </div>
          <div class="fact">
            <div class="k">Opening hours</div>
            <div class="v">24 / 7</div>
            <div class="s">Including public holidays</div>
          </div>
          <div class="fact">
            <div class="k">Registration</div>
            <div class="v">PHC Licensed</div>
            <div class="s">Nigeria Ministry of Health</div>
          </div>
          <div class="fact">
            <div class="k">Patients on file</div>
            <div class="v">${t.patients}</div>
            <div class="s">${t.newCardsToday} card(s) issued today</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="services">
      <div class="section-head">
        <div class="eyebrow">What we do</div>
        <h2>Seven services under one roof, day and night.</h2>
        <p>Everything below is delivered on site at Owoseni Street, so a patient who arrives
           at 3am for emergency care can be seen, tested and dispensed to without leaving the building.</p>
      </div>
      <div class="svc-grid">
        ${SERVICES.map(s => `
          <article class="svc">
            <div class="ic">${icon(s.icon, 21)}</div>
            <h3>${esc(s.name)}</h3>
            <p>${esc(s.desc)}</p>
          </article>`).join("")}
      </div>
    </section>

    <section class="section" id="facility" style="padding-top:0;">
      <div class="two-col">
        <div>
          <div class="section-head" style="margin-bottom:20px;">
            <div class="eyebrow">The facility</div>
            <h2>A registered facility, on the record.</h2>
            <p>Longlife Hospital is a private healthcare facility registered as a Primary Health
               Care Centre under the Nigeria Ministry of Health. Its details are listed publicly
               in Nigerian hospital directories.</p>
          </div>
          <div class="note-provenance">
            <strong>Where these details come from:</strong> the facility record below was taken from
            the hospital's own website and Nigerian hospital directory listings. Nothing here is
            invented — if a detail has changed, correct it in this file rather than guessing.
          </div>
        </div>
        <div class="record-card">
          <div class="rc-top">
            <span class="t">Facility Record</span>
            <span class="n mono">${esc(HOSPITAL.facilityCode)}</span>
          </div>
          <div class="rc-perf"></div>
          <dl>
            <div><dt>Facility</dt><dd>${esc(HOSPITAL.name)}</dd></div>
            <div><dt>Established</dt><dd>${esc(HOSPITAL.established)}</dd></div>
            <div><dt>Category</dt><dd>Primary Health Care Centre</dd></div>
            <div><dt>Ownership</dt><dd>Private, fully licensed</dd></div>
            <div><dt>Local Government</dt><dd>Oshodi / Isolo, Lagos</dd></div>
            <div><dt>Hours</dt><dd>24 hours, 7 days</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <section class="section" id="contact" style="padding-top:0;">
      <div class="two-col">
        <div>
          <div class="eyebrow">Find us</div>
          <h2 style="font-size:clamp(24px,3.4vw,34px); margin-top:10px;">Come in, or call ahead.</h2>
          <ul class="contact-list">
            <li>
              <span class="ic">${icon("pin")}</span>
              <span><span class="k">Address</span><br>
              <span class="v">${esc(HOSPITAL.address)}</span><br>
              <span style="color:var(--ink-soft); font-size:13px;">${esc(HOSPITAL.lga)}</span></span>
            </li>
            <li>
              <span class="ic">${icon("phone")}</span>
              <span><span class="k">Telephone</span><br>
              ${HOSPITAL.phones.map(p => `<a class="v" href="tel:${p.replace(/-/g, "")}">${esc(p)}</a>`).join(" &nbsp;·&nbsp; ")}</span>
            </li>
            <li>
              <span class="ic">${icon("mail")}</span>
              <span><span class="k">Email</span><br>
              <a class="v" href="mailto:${esc(HOSPITAL.email)}">${esc(HOSPITAL.email)}</a></span>
            </li>
            <li>
              <span class="ic">${icon("clock")}</span>
              <span><span class="k">Opening hours</span><br>
              <span class="v">Open 24 hours, every day</span></span>
            </li>
          </ul>
        </div>
        <div class="panel">
          <header><h3>Staff portal</h3></header>
          <div class="panel-body">
            <p style="margin-top:0; color:var(--ink-soft); font-size:14px;">
              Doctors, nurses, pharmacists and administrators each sign in with their own
              account. Cards issued at the front desk, prescriptions written in the consulting
              room and drugs dispensed at the pharmacy all land on the same patient record.
            </p>
            <div class="row" style="margin-top:16px;">
              <a class="btn" href="#/login">Sign in to the portal</a>
              <a class="btn subtle" href="#/quote">Get a cost estimate</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${siteFooter()}`;
  }

  /* ---------- patient quote (public) ---------- */

  function quoteNo() {
    if (!state.quoteNo) {
      state.quoteNo = "QT-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" +
        String(Math.floor(Math.random() * 900) + 100);
    }
    return state.quoteNo;
  }

  function viewQuote(user) {
    const services = LL.data().services;
    const drugs = LL.data().drugs.filter(d => LL.drugStatus(d).key !== "expired");
    const byCategory = {};
    services.forEach(s => { (byCategory[s.category] = byCategory[s.category] || []).push(s); });

    return `
    ${siteNav(user, "quote")}

    <section class="section" style="padding-bottom:0;">
      <div class="section-head">
        <div class="eyebrow">Cost estimate</div>
        <h2>Know what it costs before you come in.</h2>
        <p>Tick the services or medicines you need and we will total them up. Print the
           estimate or email it to yourself, then bring it to the front desk at Owoseni Street.</p>
      </div>
    </section>

    <section class="section quote-layout" style="padding-top:22px;">
      <div class="stack">
        <div class="panel">
          <header><h3>Your details</h3></header>
          <div class="panel-body">
            <div class="form-grid">
              <div class="field"><label for="q_name">Your name</label>
                <input id="q_name" placeholder="So we can address the estimate"></div>
              <div class="field"><label for="q_phone">Phone</label>
                <input id="q_phone" placeholder="0800-000-0000"></div>
              <div class="field"><label for="q_email">Your email</label>
                <input id="q_email" type="email" placeholder="To email the estimate to yourself"></div>
            </div>
          </div>
        </div>

        <div class="panel">
          <header><h3>Services</h3>
            <div class="spacer"></div>
            <input id="quoteSearch" placeholder="Search services or medicines…"
              style="padding:8px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); min-width:200px; font-size:13px;">
          </header>
          <div class="panel-body">
            ${Object.entries(byCategory).map(([cat, list]) => `
              <div class="quote-group" style="margin-bottom:18px;">
                <h4 style="font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-soft); margin-bottom:9px;">${esc(cat)}</h4>
                <div class="stack" style="gap:7px;">
                  ${list.map(s => quotePickRow("service", s.id, s.name, s.price)).join("")}
                </div>
              </div>`).join("")}
          </div>
        </div>

        <div class="panel">
          <header><h3>Medicines</h3></header>
          <div class="panel-body">
            <div class="stack" style="gap:7px;">
              ${drugs.map(d => quotePickRow("drug", d.id, `${d.name} ${d.dosage} ${d.form}`, d.unitPrice)).join("")}
            </div>
          </div>
        </div>
      </div>

      <div class="quote-side">
        <div class="panel quote-sheet" id="quoteSheet">
          <header class="no-print"><h3>Your estimate</h3>
            <div class="spacer"></div>
            <span class="mono" style="font-size:11.5px; color:var(--ink-soft);">${esc(quoteNo())}</span>
          </header>
          <div class="panel-body" id="quoteBody"></div>
        </div>
        <div class="row no-print" style="margin-top:12px;">
          <button class="btn" data-action="quote-print">${icon("print", 15)} Print estimate</button>
          <button class="btn subtle" data-action="quote-email">${icon("mail", 15)} Email it</button>
          <button class="btn subtle" data-action="quote-clear">Clear</button>
        </div>
        <p style="font-size:12px; color:var(--ink-faint); margin-top:14px;">
          This is an estimate for planning, not a bill. Final charges depend on what the
          doctor finds, and prices can change — confirm with the front desk on
          ${HOSPITAL.phones[0]}.
        </p>
      </div>
    </section>

    ${siteFooter()}`;
  }

  function quotePickRow(kind, id, name, price) {
    const picked = state.quote[kind + ":" + id];
    return `
    <label class="quote-row ${picked ? "on" : ""}" data-quote-row data-search="${esc(name.toLowerCase())}">
      <input type="checkbox" data-quote-pick data-kind="${kind}" data-id="${esc(id)}" ${picked ? "checked" : ""}>
      <span class="q-name">${esc(name)}</span>
      <span class="q-qty">
        <input type="number" min="1" value="${picked ? picked.qty : 1}" data-quote-qty data-kind="${kind}"
          data-id="${esc(id)}" aria-label="Quantity for ${esc(name)}" ${picked ? "" : "disabled"}>
      </span>
      <span class="q-price mono">${money(price)}</span>
    </label>`;
  }

  function quoteLines() {
    return Object.entries(state.quote).map(([key, v]) => ({
      kind: key.split(":")[0], refId: key.split(":").slice(1).join(":"), qty: v.qty
    }));
  }

  function paintQuote() {
    const box = document.getElementById("quoteBody");
    if (!box) return;
    const priced = LL.priceQuote(quoteLines());
    const name = (document.getElementById("q_name") || {}).value || "";

    box.innerHTML = `
      <div class="quote-head">
        <div style="font-family:Archivo,sans-serif; font-weight:800; font-size:15px;">LONGLIFE HOSPITAL</div>
        <div style="font-size:11.5px; color:var(--ink-soft);">${esc(HOSPITAL.address)}</div>
        <div class="mono" style="font-size:10.5px; color:var(--ink-faint);">${HOSPITAL.phones.join(" · ")}</div>
      </div>
      <div class="row" style="justify-content:space-between; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:9px 0; margin:12px 0; font-size:12.5px;">
        <span><strong>${esc(name || "Cost estimate")}</strong></span>
        <span class="mono" style="color:var(--ink-soft);">${esc(quoteNo())} · ${esc(LL.fmtDate(LL.todayISO()))}</span>
      </div>
      ${priced.lines.length ? `
        <table class="data" style="font-size:12.5px;">
          <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
          <tbody>${priced.lines.map(l => `<tr>
            <td style="white-space:normal;">${esc(l.name)}</td>
            <td class="num">${l.qty}</td>
            <td class="num">${money(l.total)}</td>
          </tr>`).join("")}</tbody>
        </table>
        <div class="row" style="justify-content:space-between; margin-top:14px; border-top:2px solid var(--ink); padding-top:10px;">
          <strong>Estimated total</strong>
          <strong class="mono" style="font-size:18px;">${money(priced.total)}</strong>
        </div>
        <p style="font-size:11px; color:var(--ink-faint); margin-top:12px;">
          Estimate only — valid 14 days. Final charges depend on the doctor's assessment.
        </p>`
      : `<div class="empty" style="padding:26px 10px;">Pick a service or medicine on the left and it will appear here.</div>`}`;
  }

  function quoteText() {
    const priced = LL.priceQuote(quoteLines());
    const name = (document.getElementById("q_name") || {}).value || "";
    const phone = (document.getElementById("q_phone") || {}).value || "";
    const lines = [
      "LONGLIFE HOSPITAL — COST ESTIMATE",
      HOSPITAL.address,
      HOSPITAL.phones.join(" / "),
      "",
      "Estimate: " + quoteNo(),
      "Date: " + LL.fmtDate(LL.todayISO()),
      name ? "Name: " + name : null,
      phone ? "Phone: " + phone : null,
      "",
      "ITEMS",
      ...priced.lines.map(l => `- ${l.name} x${l.qty} = ${LL.money(l.total)}`),
      "",
      "ESTIMATED TOTAL: " + LL.money(priced.total),
      "",
      "This is an estimate for planning, valid 14 days. Final charges depend on",
      "the doctor's assessment. Confirm with the front desk before treatment."
    ].filter(l => l !== null);
    return lines.join("\n");
  }

  /* ---------- login ---------- */

  function viewLogin() {
    const demo = LL.data().users;
    return `
    <div class="auth-wrap">
      <aside class="auth-aside">
        <a class="brandmark" href="#/home" style="color:#fff;">
          <span class="glyph" style="background:#4fc3a1;color:#06201a;">LL</span>
          <span class="word" style="color:#fff;">Longlife Hospital<small style="color:#7fdcc0;">Staff Portal</small></span>
        </a>
        <div>
          <h2>One patient card. Every department.</h2>
          <p>The front desk issues the card, the nurse records vitals on it, the doctor
             prescribes against it and the pharmacy dispenses from it — each drug, price
             and dispenser landing on the same record automatically.</p>
        </div>
        <p style="font-size:12.5px; color:rgba(238,247,243,.55); margin:0;">
          ${esc(HOSPITAL.address)} · Open 24/7
        </p>
      </aside>

      <main class="auth-main">
        <div class="auth-card">
          <h1>Sign in</h1>
          <p class="sub">Use your staff username and 4-digit PIN.</p>
          <div id="loginError"></div>
          <form id="loginForm" class="stack" style="gap:14px;">
            <div class="field">
              <label for="loginUser">Username</label>
              <input id="loginUser" name="username" autocomplete="username" placeholder="e.g. pharm.grace" required>
            </div>
            <div class="field">
              <label for="loginPin">PIN</label>
              <input id="loginPin" name="pin" type="password" inputmode="numeric" maxlength="8"
                     autocomplete="current-password" placeholder="••••" required>
            </div>
            <button class="btn" type="submit" style="width:100%;">Sign in</button>
          </form>

          <div class="demo-creds">
            <h4>Demonstration accounts — PIN 1234</h4>
            ${demo.map(u => `
              <div class="row" style="justify-content:space-between; gap:10px; padding:3px 0;">
                <span><strong class="mono" style="font-size:12px;">${esc(u.username)}</strong>
                  <span style="color:var(--ink-soft);"> · ${esc(LL.ROLES[u.role].label)}</span></span>
                <button type="button" data-action="fill-login" data-user="${esc(u.username)}">use</button>
              </div>`).join("")}
            <p style="margin:10px 0 0; color:var(--ink-faint); font-size:11.5px;">
              This is a browser-only demonstration: data is stored in this browser and the PIN
              check is not real security.
            </p>
          </div>

          <p style="margin-top:18px;"><a href="#/home" style="font-size:13px;">← Back to the hospital site</a></p>
        </div>
      </main>
    </div>`;
  }

  /* ---------- app shell ---------- */

  function shell(user, r) {
    const page = r.parts[1] || "dashboard";
    const nav = NAV.filter(n => LL.can(user, n.perm));
    const t = LL.totals();
    const counts = { queue: t.pending, patients: t.patients, pharmacy: t.lowStock + t.outOfStock };

    let body = "", title = "";
    switch (page) {
      case "patients": title = "Patients"; body = viewPatients(user); break;
      case "patient": title = "Patient record"; body = viewPatient(user, r.parts[2]); break;
      case "prescriptions": title = "Prescriptions"; body = viewPrescriptions(user); break;
      case "queue": title = "Dispense queue"; body = viewQueue(user); break;
      case "pharmacy": title = "Pharmacy stock"; body = viewPharmacy(user); break;
      case "finance": title = "Finance & records"; body = viewFinance(user); break;
      case "reports": title = "Reports"; body = viewReports(user); break;
      case "audit": title = "Audit trail"; body = viewAudit(user); break;
      default: title = "Dashboard"; body = viewDashboard(user);
    }

    const navLink = (n, mobile) => {
      const active = n.key === page || (page === "patient" && n.key === "patients");
      const c = counts[n.key];
      return `<a href="${n.route}" class="${active ? "active" : ""}">
        ${mobile ? "" : icon(n.icon, 17)}<span>${n.label}</span>
        ${!mobile && c ? `<span class="count">${c}</span>` : ""}
      </a>`;
    };

    return `
    <div class="app-shell">
      <aside class="app-side">
        <a class="brandmark" href="#/home">
          <span class="glyph">LL</span>
          <span class="word">Longlife<small>Care System</small></span>
        </a>
        <nav>${nav.map(n => navLink(n, false)).join("")}</nav>
        <div class="side-foot">
          <div class="side-user">
            <span class="av">${esc(LL.initials(user.name))}</span>
            <span>
              <span class="nm">${esc(user.name)}</span>
              <span class="rl">${esc(LL.ROLES[user.role].label)}</span>
            </span>
          </div>
          <button class="btn subtle sm" data-action="logout" style="width:100%; margin-top:8px;">
            ${icon("logout", 15)} Sign out
          </button>
        </div>
      </aside>

      <main class="app-main">
        <div class="app-top">
          <h1>${esc(title)}</h1>
          <div class="spacer"></div>
          <button class="kbd-hint" data-action="open-palette">
            ${icon("search", 15)} Search <kbd>Ctrl</kbd><kbd>K</kbd>
          </button>
          <div class="top-user">
            <span class="av" title="${esc(user.name)} · ${esc(LL.ROLES[user.role].label)}">${esc(LL.initials(user.name))}</span>
            <button class="btn subtle sm" data-action="logout" aria-label="Sign out">${icon("logout", 15)}</button>
          </div>
        </div>
        <div class="app-mobile-nav">${nav.map(n => navLink(n, true)).join("")}</div>
        <div class="app-body">${body}</div>
      </main>
    </div>`;
  }

  /* ---------- dashboard ---------- */

  function viewDashboard(user) {
    const t = LL.totals();
    const alerts = LL.alerts();
    const rev = LL.revenueByDay(7);
    const max = Math.max(1, ...rev.map(d => d.total));
    const acts = LL.data().activity.slice(0, 7);

    const roleGreeting = {
      doctor: "Your consulting room at a glance — who is waiting and what you have prescribed today.",
      nurse: "Front desk and ward view — cards issued, vitals taken and who still needs attention.",
      pharmacist: "Pharmacy view — prescriptions waiting, stock that needs ordering and today's dispensing.",
      admin: "Whole-facility view — patients, pharmacy, money and the audit trail."
    }[user.role];

    return `
    <div class="stack">
      <div>
        <p style="margin:0 0 14px; color:var(--ink-soft);">
          Good day, <strong>${esc(user.name)}</strong>. ${esc(roleGreeting)}
        </p>
        <div class="stat-row">
          <div class="stat"><div class="k">Patients on file</div><div class="v">${t.patients}</div>
            <div class="s">${t.newCardsToday} new card(s) today</div></div>
          <div class="stat ${t.pending ? "is-warn" : ""}"><div class="k">Awaiting dispensing</div><div class="v">${t.pending}</div>
            <div class="s">${t.dispensedToday} dispensed today</div></div>
          <div class="stat ${t.outOfStock ? "is-crit" : t.lowStock ? "is-warn" : "is-good"}">
            <div class="k">Stock needing action</div><div class="v">${t.outOfStock + t.lowStock}</div>
            <div class="s">${t.outOfStock} out · ${t.lowStock} low · ${t.expiring} expiry</div></div>
          <div class="stat"><div class="k">Dispensed today</div><div class="v">${LL.moneyShort(t.revenueToday)}</div>
            <div class="s">Stock on hand ${LL.moneyShort(t.stockValue)}</div></div>
        </div>
      </div>

      <div class="grid-side">
        <div class="panel">
          <header>
            <h3>Pharmacy revenue, last 7 days</h3>
            <div class="spacer"></div>
            <span class="pill muted mono">${money(rev.reduce((n, d) => n + d.total, 0))}</span>
          </header>
          <div class="panel-body">
            <div class="chart">
              <div class="chart-bars" role="img"
                   aria-label="Bar chart of pharmacy revenue for the last seven days">
                ${rev.map(d => `
                  <div class="chart-col" tabindex="0"
                       aria-label="${esc(d.label)} ${esc(LL.fmtDate(d.date))}: ${money(d.total)}">
                    <span class="chart-tip">${esc(d.label)} · ${money(d.total)}</span>
                    <span class="fill" style="height:${Math.max(2, Math.round((d.total / max) * 118))}px;"></span>
                    <span class="lbl">${esc(d.label)}</span>
                  </div>`).join("")}
              </div>
            </div>
            <p style="margin:14px 0 0; font-size:12.5px; color:var(--ink-faint);">
              Value of drugs dispensed each day, billed to patient cards. Card fees are counted separately.
            </p>
          </div>
        </div>

        <div class="panel">
          <header>
            <h3>Automatic alerts</h3>
            <div class="spacer"></div>
            <span class="pill ${alerts.length ? "warn" : "good"}">${alerts.length || "All clear"}</span>
          </header>
          <div class="panel-body flush">
            ${alerts.length ? alerts.slice(0, 7).map(a => `
              <div class="alert-item ${a.level}">
                <span class="bar"></span>
                <span>
                  <span class="t">${esc(a.title)}</span>
                  <span class="d">${esc(a.detail)}</span>
                </span>
              </div>`).join("")
              : `<div class="empty">Nothing needs attention — stock, expiry dates and the dispense queue are all clear.</div>`}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <header><h3>Waiting at the pharmacy</h3><div class="spacer"></div>
            ${LL.can(user, "pharmacy.dispense") ? `<a class="btn sm ghost" href="#/app/queue">Open queue</a>` : ""}
          </header>
          <div class="panel-body flush">
            ${(() => {
              const pend = LL.pendingPrescriptions().slice(0, 5);
              if (!pend.length) return `<div class="empty">No prescriptions waiting.</div>`;
              return `<div style="padding:6px 0;">${pend.map(rx => {
                const p = LL.patientById(rx.patientId);
                return `<div class="alert-item warn">
                  <span class="bar"></span>
                  <span>
                    <span class="t">${esc(p ? p.name : "Unknown patient")}
                      <span class="mono" style="font-weight:500; color:var(--ink-faint); font-size:11.5px;">${esc(p ? p.cardNo : "")}</span></span>
                    <span class="d">${rx.items.length} item(s) · ${esc(rx.diagnosis || "no diagnosis noted")} · ${esc(rx.doctorName)}</span>
                  </span>
                  <span class="act">${LL.can(user, "pharmacy.dispense")
                    ? `<button class="btn sm" data-action="dispense-rx" data-id="${rx.id}">Dispense</button>`
                    : `<span class="pill warn">Pending</span>`}</span>
                </div>`;
              }).join("")}</div>`;
            })()}
          </div>
        </div>

        <div class="panel">
          <header><h3>Recent activity</h3></header>
          <div class="panel-body">
            ${acts.length ? `<div class="timeline">${acts.map(a => `
              <div class="tl-item">
                <span class="tl-when">${esc(LL.fmtDateTime(a.at))}</span>
                <span class="tl-what">
                  <span class="t">${esc(a.action)}</span>
                  <span class="d">${esc(a.detail)} — ${esc(a.userName)}</span>
                </span>
              </div>`).join("")}</div>` : `<div class="empty">No activity recorded yet.</div>`}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- patients ---------- */

  function viewPatients(user) {
    const patients = LL.data().patients;
    return `
    <div class="stack">
      <div class="panel">
        <header>
          <h3>Patient cards</h3>
          <div class="spacer"></div>
          <input id="patientSearch" class="field" placeholder="Search name, card no or phone…"
                 style="padding:8px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); min-width:220px;">
          ${LL.can(user, "patient.create")
            ? `<button class="btn sm" data-action="new-patient">${icon("plus", 15)} New patient card</button>` : ""}
        </header>
        <div class="panel-body flush">
          <div class="table-wrap" style="border:0; border-radius:0;">
            <table class="data">
              <thead><tr>
                <th>Card no</th><th>Patient</th><th>Sex / Age</th><th>Phone</th>
                <th>Card type</th><th class="num">Card fee</th><th>Issued</th><th>Issued by</th>
                <th class="num">Total billed</th><th>Status</th><th></th>
              </tr></thead>
              <tbody id="patientRows">
                ${patients.length ? patients.map(p => patientRow(p)).join("")
                  : `<tr><td colspan="11"><div class="empty">No patient cards yet.</div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  function patientRow(p) {
    const spend = LL.patientSpend(p.id);
    const expired = p.expiresAt && LL.daysBetween(p.expiresAt, LL.todayISO()) < 0;
    return `<tr data-patient-row data-search="${esc((p.name + " " + p.cardNo + " " + p.phone).toLowerCase())}">
      <td class="num"><a href="#/app/patient/${p.id}" style="font-weight:700; text-decoration:none;">${esc(p.cardNo)}</a></td>
      <td><a href="#/app/patient/${p.id}" style="font-weight:600; text-decoration:none; color:inherit;">${esc(p.name)}</a></td>
      <td>${esc(p.sex)} · ${p.age}</td>
      <td class="num">${esc(p.phone || "—")}</td>
      <td>${esc(p.cardType)}</td>
      <td class="num">${money(p.cardFee)}</td>
      <td class="num">${esc(LL.fmtDate(p.createdAt))}</td>
      <td>${esc(p.createdBy)}</td>
      <td class="num">${money(spend.total)}</td>
      <td>${expired ? `<span class="pill crit">Expired</span>` : `<span class="pill good">${esc(p.status)}</span>`}</td>
      <td><a class="btn sm subtle" href="#/app/patient/${p.id}">Open</a></td>
    </tr>`;
  }

  function viewPatient(user, id) {
    const p = LL.patientById(id);
    if (!p) return `<div class="panel"><div class="empty">Patient not found. <a href="#/app/patients">Back to patients</a></div></div>`;

    const spend = LL.patientSpend(p.id);
    const meds = LL.dispensesFor(p.id);
    const rxs = LL.prescriptionsFor(p.id);
    const vits = LL.vitalsFor(p.id);
    const expired = p.expiresAt && LL.daysBetween(p.expiresAt, LL.todayISO()) < 0;

    return `
    <div class="stack">
      <div class="row" style="justify-content:space-between;">
        <a href="#/app/patients" style="font-size:13.5px; text-decoration:none;">← All patients</a>
        <span class="row">
          <button class="btn sm subtle" data-action="print-card" data-id="${p.id}">${icon("print", 15)} Print card</button>
          ${LL.can(user, "prescription.create") ? `<button class="btn sm" data-action="new-rx" data-patient="${p.id}">${icon("rx", 15)} New prescription</button>` : ""}
          ${LL.can(user, "vitals.create") ? `<button class="btn sm subtle" data-action="new-vitals" data-patient="${p.id}">Record vitals</button>` : ""}
          ${LL.can(user, "pharmacy.dispense") ? `<button class="btn sm subtle" data-action="counter-sale" data-patient="${p.id}">Dispense at counter</button>` : ""}
        </span>
      </div>

      <div class="grid-side">
        <div class="stack">
          <div class="panel">
            <header><h3>${esc(p.name)}</h3>
              <span class="pill ${expired ? "crit" : "good"}">${expired ? "Card expired" : p.status}</span>
              <div class="spacer"></div>
              <span class="mono" style="font-size:12.5px; color:var(--ink-soft);">${esc(p.cardNo)}</span>
            </header>
            <div class="panel-body">
              <div class="form-grid">
                ${[["Sex", p.sex], ["Age", p.age + " years"], ["Phone", p.phone || "—"],
                   ["Blood group", p.bloodGroup || "—"], ["Card type", p.cardType],
                   ["Card fee", money(p.cardFee)], ["Card issued", LL.fmtDate(p.createdAt)],
                   ["Issued by", p.createdBy], ["Card expires", LL.fmtDate(p.expiresAt)],
                   ["Address", p.address || "—"], ["Next of kin", p.nextOfKin || "—"]]
                  .map(([k, v]) => `<div>
                    <div style="font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-faint);">${esc(k)}</div>
                    <div style="font-weight:600; margin-top:2px;">${esc(v)}</div>
                  </div>`).join("")}
              </div>
            </div>
          </div>

          <div class="panel">
            <header>
              <h3>Drugs received from the pharmacy</h3>
              <div class="spacer"></div>
              <span class="pill brand mono">${meds.length} entr${meds.length === 1 ? "y" : "ies"} · ${money(spend.drugs)}</span>
            </header>
            <div class="panel-body flush">
              ${meds.length ? `
              <div class="table-wrap" style="border:0; border-radius:0; max-height:340px;">
                <table class="data">
                  <thead><tr>
                    <th>Date</th><th>Drug</th><th>Dosage</th><th class="num">Qty</th>
                    <th class="num">Unit price</th><th class="num">Total</th><th>Dispensed by</th><th>Source</th>
                  </tr></thead>
                  <tbody>${meds.map(m => {
                    const d = LL.drugById(m.drugId);
                    return `<tr>
                      <td class="num">${esc(LL.fmtDate(m.date))}</td>
                      <td>${esc(d ? d.name : "—")}</td>
                      <td>${esc(d ? d.dosage + " " + d.form : "—")}</td>
                      <td class="num">${m.qty}</td>
                      <td class="num">${money(m.unitPrice)}</td>
                      <td class="num">${money(m.qty * m.unitPrice)}</td>
                      <td>${esc(m.staffName)}</td>
                      <td>${m.prescriptionId ? `<span class="pill brand">Prescription</span>` : `<span class="pill muted">Counter</span>`}</td>
                    </tr>`;
                  }).join("")}</tbody>
                </table>
              </div>` : `<div class="empty">Nothing has been dispensed to this patient yet.</div>`}
            </div>
          </div>

          <div class="panel">
            <header><h3>Prescriptions</h3><div class="spacer"></div>
              <span class="pill muted">${rxs.length}</span></header>
            <div class="panel-body flush">
              ${rxs.length ? rxs.map(rx => `
                <div class="alert-item ${rx.status === "pending" ? "warn" : "good"}">
                  <span class="bar"></span>
                  <span>
                    <span class="t">${esc(rx.diagnosis || "Prescription")}
                      <span class="pill ${rx.status === "pending" ? "warn" : "good"}" style="margin-left:6px;">${esc(rx.status)}</span></span>
                    <span class="d">${esc(LL.fmtDateTime(rx.at))} · ${esc(rx.doctorName)}</span>
                    <span class="d">${rx.items.map(i => {
                      const d = LL.drugById(i.drugId);
                      return esc((d ? d.name + " " + d.dosage : "Drug") + " ×" + i.qty + (i.instruction ? " — " + i.instruction : ""));
                    }).join("<br>")}</span>
                  </span>
                  ${rx.status === "pending" && LL.can(user, "pharmacy.dispense")
                    ? `<span class="act"><button class="btn sm" data-action="dispense-rx" data-id="${rx.id}">Dispense</button></span>` : ""}
                </div>`).join("") : `<div class="empty">No prescriptions written for this patient.</div>`}
            </div>
          </div>

          <div class="panel">
            <header><h3>Vitals</h3></header>
            <div class="panel-body flush">
              ${vits.length ? `
              <div class="table-wrap" style="border:0; border-radius:0; max-height:260px;">
                <table class="data">
                  <thead><tr><th>Taken</th><th class="num">BP</th><th class="num">Temp</th><th class="num">Pulse</th><th class="num">Weight</th><th>By</th><th>Note</th></tr></thead>
                  <tbody>${vits.map(v => `<tr>
                    <td class="num">${esc(LL.fmtDateTime(v.at))}</td>
                    <td class="num">${esc(v.bp || "—")}</td>
                    <td class="num">${v.temp ? v.temp + "°C" : "—"}</td>
                    <td class="num">${v.pulse || "—"}</td>
                    <td class="num">${v.weight ? v.weight + "kg" : "—"}</td>
                    <td>${esc(v.takenBy)}</td>
                    <td style="white-space:normal; min-width:220px;">${esc(v.note || "—")}</td>
                  </tr>`).join("")}</tbody>
                </table>
              </div>` : `<div class="empty">No vitals recorded.</div>`}
            </div>
          </div>
        </div>

        <div class="stack">
          <div class="panel">
            <header><h3>Patient card</h3></header>
            <div class="panel-body">
              ${patientCardHtml(p)}
              <button class="btn subtle sm" data-action="print-card" data-id="${p.id}" style="margin-top:14px; width:100%;">
                ${icon("print", 15)} Print this card
              </button>
            </div>
          </div>

          <div class="panel">
            <header><h3>Account</h3>
              <div class="spacer"></div>
              <span class="pill ${spend.outstanding > 0 ? "warn" : "good"}">${spend.outstanding > 0 ? "Owing" : "Settled"}</span>
            </header>
            <div class="panel-body">
              <div class="stack" style="gap:10px;">
                ${[["Card fee", spend.card], ["Services & procedures", spend.services], ["Drugs dispensed", spend.drugs]]
                  .map(([k, v]) => `<div class="row" style="justify-content:space-between;">
                    <span style="color:var(--ink-soft); font-size:13.5px;">${k}</span>
                    <span class="mono" style="font-weight:600;">${money(v)}</span>
                  </div>`).join("")}
                <div class="row" style="justify-content:space-between; border-top:1px solid var(--line); padding-top:10px;">
                  <span style="font-weight:700;">Total billed</span>
                  <span class="mono" style="font-weight:700;">${money(spend.billed)}</span>
                </div>
                <div class="row" style="justify-content:space-between;">
                  <span style="color:var(--good); font-size:13.5px; font-weight:600;">Paid</span>
                  <span class="mono" style="font-weight:600; color:var(--good);">${money(spend.paid)}</span>
                </div>
                <div class="row" style="justify-content:space-between; border-top:2px solid var(--ink); padding-top:10px;">
                  <span style="font-weight:800;">Outstanding</span>
                  <span class="mono" style="font-weight:800; font-size:18px; color:${spend.outstanding > 0 ? "var(--crit)" : "var(--good)"};">${money(spend.outstanding)}</span>
                </div>
              </div>
              <div class="stack" style="gap:8px; margin-top:14px;">
                ${LL.can(user, "charge.create") ? `<button class="btn subtle sm" data-action="add-charge" data-patient="${p.id}">${icon("plus", 15)} Bill a service</button>` : ""}
                ${LL.can(user, "payment.create") ? `<button class="btn sm" data-action="record-payment" data-patient="${p.id}">${icon("cash", 15)} Record payment</button>` : ""}
                <button class="btn subtle sm" data-action="print-receipt" data-id="${p.id}">${icon("print", 15)} Print statement</button>
              </div>
            </div>
          </div>

          ${(() => {
            const ch = LL.chargesFor(p.id);
            const pays = LL.paymentsFor(p.id);
            if (!ch.length && !pays.length) return "";
            return `
            <div class="panel">
              <header><h3>Charges &amp; payments</h3></header>
              <div class="panel-body flush">
                ${ch.map(c => `
                  <div class="alert-item">
                    <span class="bar" style="background:var(--line-strong);"></span>
                    <span><span class="t">${esc(c.name)}</span>
                      <span class="d">${esc(LL.fmtDateTime(c.at))} · ${esc(c.staffName)}</span></span>
                    <span class="act mono" style="font-weight:700;">${money(c.amount)}</span>
                  </div>`).join("")}
                ${pays.map(x => `
                  <div class="alert-item good">
                    <span class="bar"></span>
                    <span><span class="t">Payment · ${esc(x.method)}
                      <span class="mono" style="font-weight:500; font-size:11px; color:var(--ink-faint);">${esc(x.ref || "")}</span></span>
                      <span class="d">${esc(LL.fmtDateTime(x.at))} · ${esc(x.staffName)}${x.forWhat ? " · " + esc(x.forWhat) : ""}</span></span>
                    <span class="act mono" style="font-weight:700; color:var(--good);">−${money(x.amount)}</span>
                  </div>`).join("")}
              </div>
            </div>`;
          })()}
        </div>
      </div>
    </div>`;
  }

  function patientCardHtml(p) {
    return `
    <div class="pcard">
      <div class="pc-head">
        <div>
          <div class="pc-hosp">LONGLIFE HOSPITAL</div>
          <div class="pc-sub">Oshodi · Lagos · Est. 2005</div>
        </div>
        <div class="pc-sub" style="text-align:right;">${esc(p.cardType)}<br>card</div>
      </div>
      <div class="pc-no">${esc(p.cardNo)}</div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-meta">
        <span><span class="k">Sex / Age</span><br><span class="v">${esc(p.sex)} · ${p.age}</span></span>
        <span><span class="k">Blood</span><br><span class="v">${esc(p.bloodGroup || "—")}</span></span>
        <span><span class="k">Issued</span><br><span class="v">${esc(LL.fmtDate(p.createdAt))}</span></span>
        <span><span class="k">Expires</span><br><span class="v">${esc(LL.fmtDate(p.expiresAt))}</span></span>
      </div>
    </div>`;
  }

  /* ---------- prescriptions ---------- */

  function viewPrescriptions(user) {
    const rxs = [...LL.data().prescriptions].sort((a, b) => (a.at < b.at ? 1 : -1));
    return `
    <div class="panel">
      <header>
        <h3>All prescriptions</h3>
        <div class="spacer"></div>
        ${LL.can(user, "prescription.create")
          ? `<button class="btn sm" data-action="new-rx">${icon("plus", 15)} Write prescription</button>` : ""}
      </header>
      <div class="panel-body flush">
        ${rxs.length ? `
        <div class="table-wrap" style="border:0; border-radius:0;">
          <table class="data">
            <thead><tr>
              <th>Written</th><th>Patient</th><th>Card no</th><th>Diagnosis</th>
              <th>Items</th><th>Doctor</th><th class="num">Value</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>${rxs.map(rx => {
              const p = LL.patientById(rx.patientId);
              const value = rx.items.reduce((n, i) => {
                const d = LL.drugById(i.drugId);
                return n + (d ? d.unitPrice * i.qty : 0);
              }, 0);
              return `<tr>
                <td class="num">${esc(LL.fmtDateTime(rx.at))}</td>
                <td>${p ? `<a href="#/app/patient/${p.id}" style="text-decoration:none; font-weight:600;">${esc(p.name)}</a>` : "—"}</td>
                <td class="num">${esc(p ? p.cardNo : "—")}</td>
                <td style="white-space:normal; max-width:220px;">${esc(rx.diagnosis || "—")}</td>
                <td class="num">${rx.items.length}</td>
                <td>${esc(rx.doctorName)}</td>
                <td class="num">${money(value)}</td>
                <td><span class="pill ${rx.status === "pending" ? "warn" : "good"}">${esc(rx.status)}</span></td>
                <td>${rx.status === "pending" && LL.can(user, "pharmacy.dispense")
                  ? `<button class="btn sm" data-action="dispense-rx" data-id="${rx.id}">Dispense</button>` : ""}</td>
              </tr>`;
            }).join("")}</tbody>
          </table>
        </div>` : `<div class="empty">No prescriptions written yet.</div>`}
      </div>
    </div>`;
  }

  function viewQueue(user) {
    const pend = LL.pendingPrescriptions();
    return `
    <div class="stack">
      <div class="panel">
        <header>
          <h3>Prescriptions waiting to be dispensed</h3>
          <div class="spacer"></div>
          <span class="pill ${pend.length ? "warn" : "good"}">${pend.length} waiting</span>
        </header>
        <div class="panel-body flush">
          ${pend.length ? pend.map(rx => {
            const p = LL.patientById(rx.patientId);
            const lines = rx.items.map(i => {
              const d = LL.drugById(i.drugId);
              if (!d) return { text: "Unknown drug", ok: false, note: "no longer in the catalogue" };
              const st = LL.drugStatus(d);
              const ok = st.key !== "expired" && st.stock >= i.qty;
              return {
                text: `${d.name} ${d.dosage} ${d.form} ×${i.qty}`,
                sub: i.instruction, ok,
                note: st.key === "expired" ? "batch expired" : (st.stock < i.qty ? `only ${st.stock} in stock` : `${st.stock} in stock`),
                price: d.unitPrice * i.qty
              };
            });
            const total = lines.reduce((n, l) => n + (l.price || 0), 0);
            const blocked = lines.some(l => !l.ok);
            return `
            <div style="padding:18px; border-bottom:1px solid var(--line);">
              <div class="row" style="justify-content:space-between; align-items:flex-start;">
                <div>
                  <div style="font-weight:800; font-size:16px;">
                    ${esc(p ? p.name : "Unknown patient")}
                    <span class="mono" style="font-weight:500; font-size:12px; color:var(--ink-soft);">${esc(p ? p.cardNo : "")}</span>
                  </div>
                  <div style="font-size:13px; color:var(--ink-soft); margin-top:2px;">
                    ${esc(rx.diagnosis || "No diagnosis noted")} · ${esc(rx.doctorName)} · ${esc(LL.fmtDateTime(rx.at))}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div class="mono" style="font-weight:800; font-size:17px;">${money(total)}</div>
                  <div style="font-size:11.5px; color:var(--ink-faint);">${lines.length} item(s)</div>
                </div>
              </div>

              <div style="margin-top:12px; display:grid; gap:6px;">
                ${lines.map(l => `
                  <div class="row" style="justify-content:space-between; padding:8px 12px; border-radius:8px; background:var(--surface-2);">
                    <span>
                      <strong style="font-size:13.5px;">${esc(l.text)}</strong>
                      ${l.sub ? `<span style="display:block; font-size:12px; color:var(--ink-soft);">${esc(l.sub)}</span>` : ""}
                    </span>
                    <span class="pill ${l.ok ? "good" : "crit"}">${esc(l.note)}</span>
                  </div>`).join("")}
              </div>

              <div class="row" style="margin-top:14px;">
                <button class="btn" data-action="dispense-rx" data-id="${rx.id}" ${blocked ? "disabled" : ""}>
                  ${icon("check", 15)} Dispense &amp; bill to card
                </button>
                ${p ? `<a class="btn subtle sm" href="#/app/patient/${p.id}">Open patient record</a>` : ""}
                ${blocked ? `<span class="pill crit">Blocked — stock cannot cover this prescription</span>` : ""}
              </div>
            </div>`;
          }).join("") : `<div class="empty">The queue is empty — every prescription has been dispensed.</div>`}
        </div>
      </div>
    </div>`;
  }

  /* ---------- pharmacy ---------- */

  function viewPharmacy(user) {
    const drugs = LL.data().drugs;
    const t = LL.totals();
    const reorder = drugs.filter(d => ["low", "out"].includes(LL.drugStatus(d).key));
    const moves = [...LL.data().movements].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40);

    return `
    <div class="stack">
      <div class="stat-row">
        <div class="stat"><div class="k">Drugs in catalogue</div><div class="v">${t.drugs}</div></div>
        <div class="stat ${t.outOfStock ? "is-crit" : "is-good"}"><div class="k">Out of stock</div><div class="v">${t.outOfStock}</div></div>
        <div class="stat ${t.lowStock ? "is-warn" : "is-good"}"><div class="k">Below reorder level</div><div class="v">${t.lowStock}</div></div>
        <div class="stat"><div class="k">Stock value</div><div class="v">${LL.moneyShort(t.stockValue)}</div>
          <div class="s">at current unit prices</div></div>
      </div>

      ${reorder.length ? `
      <div class="panel">
        <header><h3>Auto-generated reorder list</h3>
          <div class="spacer"></div>
          <button class="btn sm subtle" data-action="export-reorder">${icon("download", 15)} Export CSV</button>
        </header>
        <div class="panel-body flush">
          <div class="table-wrap" style="border:0; border-radius:0; max-height:none;">
            <table class="data">
              <thead><tr><th>Drug</th><th class="num">In stock</th><th class="num">Reorder level</th>
                <th class="num">Suggested order</th><th class="num">Est. cost</th><th>Status</th><th></th></tr></thead>
              <tbody>${reorder.map(d => {
                const st = LL.drugStatus(d);
                const qty = LL.suggestedOrder(d);
                return `<tr>
                  <td><strong>${esc(d.name)}</strong> ${esc(d.dosage)}</td>
                  <td class="num">${st.stock}</td>
                  <td class="num">${d.reorderLevel}</td>
                  <td class="num"><strong>${qty}</strong></td>
                  <td class="num">${money(qty * d.unitPrice)}</td>
                  <td><span class="pill ${st.cls}">${esc(st.label)}</span></td>
                  <td>${LL.can(user, "pharmacy.stock")
                    ? `<button class="btn sm subtle" data-action="receive-stock" data-drug="${d.id}" data-qty="${qty}">Receive</button>` : ""}</td>
                </tr>`;
              }).join("")}</tbody>
            </table>
          </div>
        </div>
      </div>` : ""}

      <div class="panel">
        <header>
          <h3>Drug catalogue</h3>
          <div class="spacer"></div>
          ${LL.can(user, "pharmacy.stock") ? `
            <button class="btn sm subtle" data-action="receive-stock">${icon("plus", 15)} Receive stock</button>
            <button class="btn sm" data-action="add-drug">${icon("plus", 15)} Add drug</button>` : ""}
        </header>
        <div class="panel-body flush">
          <div class="table-wrap" style="border:0; border-radius:0;">
            <table class="data">
              <thead><tr>
                <th>Drug</th><th>Dosage</th><th>Form</th><th class="num">Unit price</th>
                <th class="num">In stock</th><th class="num">Reorder at</th><th>Batch</th><th>Expiry</th><th>Status</th>
              </tr></thead>
              <tbody>${drugs.map(d => {
                const st = LL.drugStatus(d);
                return `<tr>
                  <td><strong>${esc(d.name)}</strong></td>
                  <td class="num">${esc(d.dosage)}</td>
                  <td>${esc(d.form)}</td>
                  <td class="num">${money(d.unitPrice)}</td>
                  <td class="num">${st.stock}</td>
                  <td class="num">${d.reorderLevel}</td>
                  <td class="num">${esc(d.batch || "—")}</td>
                  <td class="num">${esc(d.expiry ? LL.fmtDate(d.expiry) : "—")}</td>
                  <td><span class="pill ${st.cls}">${esc(st.label)}</span></td>
                </tr>`;
              }).join("")}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="panel">
        <header><h3>Stock ledger</h3><div class="spacer"></div>
          <button class="btn sm subtle" data-action="export-ledger">${icon("download", 15)} Export CSV</button>
        </header>
        <div class="panel-body flush">
          <div class="table-wrap" style="border:0; border-radius:0;">
            <table class="data">
              <thead><tr>
                <th>When</th><th>Type</th><th>Drug</th><th class="num">Qty</th><th class="num">Unit price</th>
                <th class="num">Value</th><th>Patient</th><th>Staff</th><th>Note</th>
              </tr></thead>
              <tbody>${moves.length ? moves.map(m => {
                const d = LL.drugById(m.drugId);
                return `<tr>
                  <td class="num">${esc(LL.fmtDate(m.date))}</td>
                  <td><span class="pill ${m.type === "IN" ? "brand" : "muted"}">${m.type === "IN" ? "Stock in" : "Dispensed"}</span></td>
                  <td>${esc(d ? d.name + " " + d.dosage : "—")}</td>
                  <td class="num">${m.qty}</td>
                  <td class="num">${money(m.unitPrice)}</td>
                  <td class="num">${money(m.qty * m.unitPrice)}</td>
                  <td>${m.patientId ? `<a href="#/app/patient/${m.patientId}" style="text-decoration:none;">${esc(m.patientName || "Patient")}</a>` : "—"}</td>
                  <td>${esc(m.staffName)}</td>
                  <td style="white-space:normal; max-width:220px;">${esc(m.note || "—")}</td>
                </tr>`;
              }).join("") : `<tr><td colspan="9"><div class="empty">No stock movements yet.</div></td></tr>`}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- reports & audit ---------- */

  /* ---------- finance (admin) ---------- */

  function viewFinance(user) {
    if (!LL.can(user, "finance")) {
      return `<div class="panel"><div class="empty">Finance records are only open to administrators.</div></div>`;
    }
    const f = LL.finance();
    const cash = LL.cashByDay(7);
    const maxCash = Math.max(1, ...cash.map(d => Math.max(d.received, d.spent)));
    const payments = LL.data().payments;
    const expenses = LL.data().expenses;

    return `
    <div class="stack">
      <div class="stat-row">
        <div class="stat"><div class="k">Billed to patients</div><div class="v">${LL.moneyShort(f.billed)}</div>
          <div class="s">cards ${LL.moneyShort(f.cardsBilled)} · services ${LL.moneyShort(f.servicesBilled)} · drugs ${LL.moneyShort(f.drugsBilled)}</div></div>
        <div class="stat is-good"><div class="k">Money received</div><div class="v">${LL.moneyShort(f.received)}</div>
          <div class="s">${money(f.receivedToday)} today</div></div>
        <div class="stat ${f.outstanding > 0 ? "is-warn" : "is-good"}"><div class="k">Outstanding</div><div class="v">${LL.moneyShort(f.outstanding)}</div>
          <div class="s">${f.debtors.length} patient(s) owing</div></div>
        <div class="stat ${f.net < 0 ? "is-crit" : ""}"><div class="k">Net position</div><div class="v">${LL.moneyShort(f.net)}</div>
          <div class="s">received less ${LL.moneyShort(f.spent)} spent</div></div>
      </div>

      <div class="row no-print">
        ${LL.can(user, "payment.create") ? `<button class="btn sm" data-action="record-payment">${icon("cash", 15)} Record payment</button>` : ""}
        ${LL.can(user, "expense.create") ? `<button class="btn sm subtle" data-action="add-expense">${icon("plus", 15)} Record expense</button>` : ""}
        <button class="btn sm subtle" data-action="export-finance">${icon("download", 15)} Export finance records</button>
        <button class="btn sm subtle" data-action="do-print">${icon("print", 15)} Print this page</button>
      </div>

      <div class="grid-side">
        <div class="panel">
          <header><h3>Money in and out, last 7 days</h3>
            <div class="spacer"></div>
            <span class="pill good mono">in ${LL.moneyShort(cash.reduce((n, d) => n + d.received, 0))}</span>
            <span class="pill crit mono">out ${LL.moneyShort(cash.reduce((n, d) => n + d.spent, 0))}</span>
          </header>
          <div class="panel-body">
            <div class="chart">
              <div class="chart-bars" role="img" aria-label="Money received and spent for each of the last seven days">
                ${cash.map(d => `
                  <div class="chart-col pair" tabindex="0"
                       aria-label="${esc(d.label)}: received ${money(d.received)}, spent ${money(d.spent)}">
                    <span class="chart-tip">${esc(d.label)} · in ${money(d.received)} · out ${money(d.spent)}</span>
                    <span class="pair-bars">
                      <span class="fill" style="height:${Math.max(2, Math.round((d.received / maxCash) * 112))}px;"></span>
                      <span class="fill out" style="height:${Math.max(2, Math.round((d.spent / maxCash) * 112))}px;"></span>
                    </span>
                    <span class="lbl">${esc(d.label)}</span>
                  </div>`).join("")}
              </div>
            </div>
            <div class="row" style="margin-top:14px; gap:16px;">
              <span class="row" style="gap:6px;"><span class="key-swatch"></span><span style="font-size:12.5px; color:var(--ink-soft);">Received</span></span>
              <span class="row" style="gap:6px;"><span class="key-swatch out"></span><span style="font-size:12.5px; color:var(--ink-soft);">Spent</span></span>
            </div>
          </div>
        </div>

        <div class="panel">
          <header><h3>Patients owing</h3><div class="spacer"></div>
            <span class="pill ${f.debtors.length ? "warn" : "good"}">${f.debtors.length || "None"}</span></header>
          <div class="panel-body flush">
            ${f.debtors.length ? f.debtors.slice(0, 8).map(x => `
              <div class="alert-item warn">
                <span class="bar"></span>
                <span>
                  <span class="t"><a href="#/app/patient/${x.patient.id}" style="text-decoration:none; color:inherit;">${esc(x.patient.name)}</a>
                    <span class="mono" style="font-weight:500; font-size:11.5px; color:var(--ink-faint);">${esc(x.patient.cardNo)}</span></span>
                  <span class="d">billed ${money(x.billed)} · paid ${money(x.paid)}</span>
                </span>
                <span class="act mono" style="font-weight:700;">${money(x.outstanding)}</span>
              </div>`).join("")
              : `<div class="empty">Every patient account is settled.</div>`}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <header><h3>Income by source</h3></header>
          <div class="panel-body">
            ${barList([
              ["Patient cards", f.cardsBilled],
              ["Services & procedures", f.servicesBilled],
              ["Pharmacy drugs", f.drugsBilled]
            ], "Nothing billed yet.")}
            <h4 style="margin:20px 0 10px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft);">Received by method</h4>
            ${barList(Object.entries(f.byMethod), "No payments recorded yet.")}
          </div>
        </div>
        <div class="panel">
          <header><h3>Spending by category</h3></header>
          <div class="panel-body">
            ${barList(Object.entries(f.byCategory), "No expenses recorded yet.")}
          </div>
        </div>
      </div>

      <div class="panel">
        <header><h3>Payment records</h3><div class="spacer"></div>
          <span class="pill muted">${payments.length} receipt(s)</span></header>
        <div class="panel-body flush">
          ${payments.length ? `
          <div class="table-wrap" style="border:0; border-radius:0;">
            <table class="data">
              <thead><tr><th>Receipt</th><th>When</th><th>Patient</th><th>For</th><th>Method</th><th class="num">Amount</th><th>Received by</th></tr></thead>
              <tbody>${payments.map(p => `<tr>
                <td class="num"><strong>${esc(p.ref || "—")}</strong></td>
                <td class="num">${esc(LL.fmtDateTime(p.at))}</td>
                <td><a href="#/app/patient/${p.patientId}" style="text-decoration:none;">${esc(p.patientName)}</a></td>
                <td style="white-space:normal; min-width:180px;">${esc(p.forWhat || "—")}</td>
                <td><span class="pill muted">${esc(p.method)}</span></td>
                <td class="num"><strong>${money(p.amount)}</strong></td>
                <td>${esc(p.staffName)}</td>
              </tr>`).join("")}</tbody>
            </table>
          </div>` : `<div class="empty">No payments recorded yet.</div>`}
        </div>
      </div>

      <div class="panel">
        <header><h3>Expense records</h3><div class="spacer"></div>
          <span class="pill muted">${money(f.spent)} total</span></header>
        <div class="panel-body flush">
          ${expenses.length ? `
          <div class="table-wrap" style="border:0; border-radius:0;">
            <table class="data">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th>Recorded by</th></tr></thead>
              <tbody>${expenses.map(e => `<tr>
                <td class="num">${esc(LL.fmtDate(e.date))}</td>
                <td><span class="pill muted">${esc(e.category)}</span></td>
                <td style="white-space:normal; min-width:220px;">${esc(e.description)}</td>
                <td class="num"><strong>${money(e.amount)}</strong></td>
                <td>${esc(e.staffName)}</td>
              </tr>`).join("")}</tbody>
            </table>
          </div>` : `<div class="empty">No expenses recorded yet.</div>`}
        </div>
      </div>
    </div>`;
  }

  /** Horizontal bar list for a set of [label, value] pairs. */
  function barList(pairs, emptyText) {
    const rows = pairs.filter(p => Number(p[1]) > 0);
    if (!rows.length) return `<div class="empty" style="padding:18px;">${esc(emptyText)}</div>`;
    const max = Math.max(...rows.map(r => Number(r[1])));
    return `<div class="stack" style="gap:11px;">${rows.map(([label, value]) => `
      <div>
        <div class="row" style="justify-content:space-between; margin-bottom:5px;">
          <span style="font-weight:600; font-size:13.5px;">${esc(label)}</span>
          <span class="mono" style="font-size:12.5px; color:var(--ink-soft);">${money(value)}</span>
        </div>
        <div style="height:9px; background:var(--surface-2); border-radius:5px; overflow:hidden;">
          <div style="height:100%; width:${Math.max(2, (value / max) * 100)}%; background:var(--brand); border-radius:5px;"></div>
        </div>
      </div>`).join("")}</div>`;
  }

  function viewReports(user) {
    const t = LL.totals();
    const drugs = LL.data().drugs.map(d => {
      const sold = LL.data().movements
        .filter(m => m.type === "OUT" && m.drugId === d.id)
        .reduce((acc, m) => ({ qty: acc.qty + m.qty, value: acc.value + m.qty * m.unitPrice }), { qty: 0, value: 0 });
      return { drug: d, ...sold };
    }).sort((a, b) => b.value - a.value);
    const topValue = Math.max(1, ...drugs.map(d => d.value));

    return `
    <div class="stack">
      <div class="stat-row">
        <div class="stat"><div class="k">Total billed</div><div class="v">${LL.moneyShort(t.revenue)}</div>
          <div class="s">drugs ${LL.moneyShort(t.drugRevenue)} · cards ${LL.moneyShort(t.cardRevenue)}</div></div>
        <div class="stat"><div class="k">Cards issued</div><div class="v">${t.patients}</div></div>
        <div class="stat"><div class="k">Dispensed today</div><div class="v">${t.dispensedToday}</div>
          <div class="s">${money(t.revenueToday)}</div></div>
        <div class="stat"><div class="k">Stock on hand</div><div class="v">${LL.moneyShort(t.stockValue)}</div></div>
      </div>

      <div class="panel">
        <header><h3>Drugs by value dispensed</h3>
          <div class="spacer"></div>
          <button class="btn sm subtle" data-action="export-dispensing">${icon("download", 15)} Export CSV</button>
        </header>
        <div class="panel-body">
          <div class="stack" style="gap:11px;">
            ${drugs.filter(d => d.qty > 0).length ? drugs.filter(d => d.qty > 0).map(d => `
              <div>
                <div class="row" style="justify-content:space-between; margin-bottom:5px;">
                  <span style="font-weight:600; font-size:13.5px;">${esc(d.drug.name)} ${esc(d.drug.dosage)}</span>
                  <span class="mono" style="font-size:12.5px; color:var(--ink-soft);">${d.qty} unit(s) · ${money(d.value)}</span>
                </div>
                <div style="height:9px; background:var(--surface-2); border-radius:5px; overflow:hidden;">
                  <div style="height:100%; width:${Math.max(2, (d.value / topValue) * 100)}%; background:var(--brand); border-radius:5px;"></div>
                </div>
              </div>`).join("") : `<div class="empty">Nothing dispensed yet.</div>`}
          </div>
        </div>
      </div>

      <div class="panel">
        <header><h3>Patient billing</h3>
          <div class="spacer"></div>
          <button class="btn sm subtle" data-action="export-patients">${icon("download", 15)} Export CSV</button>
        </header>
        <div class="panel-body flush">
          <div class="table-wrap" style="border:0; border-radius:0;">
            <table class="data">
              <thead><tr><th>Card no</th><th>Patient</th><th class="num">Card fee</th>
                <th class="num">Drugs</th><th class="num">Total</th><th class="num">Items received</th></tr></thead>
              <tbody>${LL.data().patients.map(p => {
                const s = LL.patientSpend(p.id);
                return `<tr>
                  <td class="num">${esc(p.cardNo)}</td>
                  <td><a href="#/app/patient/${p.id}" style="text-decoration:none;">${esc(p.name)}</a></td>
                  <td class="num">${money(s.card)}</td>
                  <td class="num">${money(s.drugs)}</td>
                  <td class="num"><strong>${money(s.total)}</strong></td>
                  <td class="num">${LL.dispensesFor(p.id).length}</td>
                </tr>`;
              }).join("")}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  function viewAudit() {
    const acts = LL.data().activity;
    return `
    <div class="panel">
      <header><h3>Audit trail</h3>
        <div class="spacer"></div>
        <span class="pill muted">${acts.length} entries</span>
        <button class="btn sm subtle" data-action="export-audit">${icon("download", 15)} Export CSV</button>
      </header>
      <div class="panel-body flush">
        ${acts.length ? `
        <div class="table-wrap" style="border:0; border-radius:0;">
          <table class="data">
            <thead><tr><th>When</th><th>Staff</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>${acts.map(a => `<tr>
              <td class="num">${esc(LL.fmtDateTime(a.at))}</td>
              <td>${esc(a.userName)}</td>
              <td><span class="pill muted">${esc(LL.ROLES[a.role] ? LL.ROLES[a.role].label : a.role)}</span></td>
              <td><strong>${esc(a.action)}</strong></td>
              <td style="white-space:normal;">${esc(a.detail)}</td>
            </tr>`).join("")}</tbody>
          </table>
        </div>` : `<div class="empty">No activity recorded yet.</div>`}
      </div>
    </div>`;
  }

  /* ---------- modals ---------- */

  function openModal(kind, opts) {
    state.modal = Object.assign({ kind }, opts || {});
    if (kind === "new-rx") state.rxItems = [{ drugId: "", qty: 1, instruction: "" }];
    renderModal();
  }

  function closeModal() {
    state.modal = null;
    const el = document.querySelector(".modal-backdrop");
    if (el) el.remove();
  }

  function renderModal() {
    const old = document.querySelector(".modal-backdrop");
    if (old) old.remove();
    if (!state.modal) return;

    const m = state.modal;
    let html = "";
    if (m.kind === "new-patient") html = modalNewPatient();
    else if (m.kind === "new-rx") html = modalNewRx(m);
    else if (m.kind === "new-vitals") html = modalVitals(m);
    else if (m.kind === "counter-sale") html = modalCounterSale(m);
    else if (m.kind === "receive-stock") html = modalReceiveStock(m);
    else if (m.kind === "add-drug") html = modalAddDrug();
    else if (m.kind === "record-payment") html = modalPayment(m);
    else if (m.kind === "add-expense") html = modalExpense();
    else if (m.kind === "add-charge") html = modalCharge(m);
    else if (m.kind === "print-card") html = modalPrintCard(m);
    else if (m.kind === "print-receipt") html = modalReceipt(m);

    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    const first = wrap.querySelector("input,select,textarea,button");
    if (first) first.focus();
  }

  function patientOptions(selected) {
    return LL.data().patients.map(p =>
      `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${esc(p.name)} — ${esc(p.cardNo)}</option>`).join("");
  }

  function drugOptions(selected) {
    return LL.data().drugs.map(d => {
      const st = LL.drugStatus(d);
      return `<option value="${d.id}" ${d.id === selected ? "selected" : ""}>${esc(d.name)} ${esc(d.dosage)} — ${st.stock} in stock</option>`;
    }).join("");
  }

  function modalNewPatient() {
    return `
    <div class="modal">
      <header><h3>Issue a new patient card</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formNewPatient">
        <div class="modal-body">
          <p style="margin-top:0; font-size:13px; color:var(--ink-soft);">
            The card number is generated automatically and the card is valid for one year from today.
          </p>
          <div class="form-grid">
            <div class="field"><label for="np_name">Patient name</label>
              <input id="np_name" name="name" required placeholder="Surname first"></div>
            <div class="field"><label for="np_sex">Sex</label>
              <select id="np_sex" name="sex"><option>Female</option><option>Male</option></select></div>
            <div class="field"><label for="np_age">Age</label>
              <input id="np_age" name="age" type="number" min="0" max="130" required></div>
            <div class="field"><label for="np_phone">Phone</label>
              <input id="np_phone" name="phone" placeholder="0803-000-0000"></div>
            <div class="field"><label for="np_blood">Blood group</label>
              <select id="np_blood" name="bloodGroup">
                <option value="">Unknown</option>
                ${["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(b => `<option>${b}</option>`).join("")}
              </select></div>
            <div class="field"><label for="np_type">Card type</label>
              <select id="np_type" name="cardType">
                <option value="Standard" data-fee="2000">Standard — ₦2,000</option>
                <option value="Antenatal" data-fee="3500">Antenatal — ₦3,500</option>
                <option value="Child" data-fee="1500">Child — ₦1,500</option>
                <option value="Family" data-fee="5000">Family — ₦5,000</option>
              </select></div>
            <div class="field"><label for="np_fee">Card fee (₦)</label>
              <input id="np_fee" name="cardFee" type="number" min="0" step="any" value="2000" required>
              <span class="help">Filled in from the card type — change it if the desk agreed another price.</span></div>
            <div class="field"><label for="np_kin">Next of kin</label>
              <input id="np_kin" name="nextOfKin" placeholder="Name · phone"></div>
          </div>
          <div class="field" style="margin-top:14px;"><label for="np_addr">Address</label>
            <input id="np_addr" name="address" placeholder="Street, area"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Issue card</button>
        </div>
      </form>
    </div>`;
  }

  function modalNewRx(m) {
    return `
    <div class="modal wide">
      <header><h3>Write a prescription</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formNewRx">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field"><label for="rx_patient">Patient</label>
              <select id="rx_patient" name="patientId" required>${patientOptions(m.patientId)}</select></div>
            <div class="field"><label for="rx_diag">Diagnosis</label>
              <input id="rx_diag" name="diagnosis" placeholder="e.g. Malaria (uncomplicated)"></div>
          </div>

          <h4 style="margin:20px 0 8px; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft);">Drugs</h4>
          <div id="rxItems" class="stack" style="gap:10px;">
            ${state.rxItems.map((it, i) => rxItemRow(it, i)).join("")}
          </div>
          <button type="button" class="btn subtle sm" data-action="rx-add-item" style="margin-top:10px;">
            ${icon("plus", 14)} Add another drug
          </button>
          <p style="font-size:12.5px; color:var(--ink-faint); margin-top:14px;">
            The pharmacy sees this in its dispense queue immediately. Stock is only deducted when
            the pharmacist dispenses it.
          </p>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Send to pharmacy</button>
        </div>
      </form>
    </div>`;
  }

  function rxItemRow(it, i) {
    return `
    <div class="row rx-item" data-index="${i}" style="gap:8px; align-items:flex-end;">
      <div class="field" style="flex:2; min-width:170px;">
        <label>Drug</label>
        <select name="drugId" required><option value="">Select a drug</option>${drugOptions(it.drugId)}</select>
      </div>
      <div class="field" style="width:88px;">
        <label>Qty</label>
        <input name="qty" type="number" min="1" value="${it.qty || 1}" required>
      </div>
      <div class="field" style="flex:2; min-width:170px;">
        <label>Instruction</label>
        <input name="instruction" placeholder="e.g. 1 tablet twice daily" value="${esc(it.instruction || "")}">
      </div>
      <button type="button" class="btn subtle sm" data-action="rx-remove-item" data-index="${i}"
        style="margin-bottom:1px;" aria-label="Remove this drug">&times;</button>
    </div>`;
  }

  function modalVitals(m) {
    return `
    <div class="modal">
      <header><h3>Record vitals</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formVitals">
        <div class="modal-body">
          <div class="field" style="margin-bottom:14px;"><label for="v_patient">Patient</label>
            <select id="v_patient" name="patientId" required>${patientOptions(m.patientId)}</select></div>
          <div class="form-grid">
            <div class="field"><label for="v_bp">Blood pressure</label>
              <input id="v_bp" name="bp" placeholder="120/80"></div>
            <div class="field"><label for="v_temp">Temperature (°C)</label>
              <input id="v_temp" name="temp" type="number" step="0.1" placeholder="36.8"></div>
            <div class="field"><label for="v_pulse">Pulse (bpm)</label>
              <input id="v_pulse" name="pulse" type="number" placeholder="78"></div>
            <div class="field"><label for="v_weight">Weight (kg)</label>
              <input id="v_weight" name="weight" type="number" step="0.1" placeholder="70"></div>
          </div>
          <div class="field" style="margin-top:14px;"><label for="v_note">Observation</label>
            <input id="v_note" name="note" placeholder="What the patient reports"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Save vitals</button>
        </div>
      </form>
    </div>`;
  }

  function modalCounterSale(m) {
    return `
    <div class="modal">
      <header><h3>Dispense at the counter</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formCounter">
        <div class="modal-body">
          <p style="margin-top:0; font-size:13px; color:var(--ink-soft);">
            For a sale without a prescription. It still lands on the patient's card so their
            record and bill stay complete.
          </p>
          <div class="field" style="margin-bottom:14px;"><label for="cs_patient">Patient</label>
            <select id="cs_patient" name="patientId" required>${patientOptions(m.patientId)}</select></div>
          <div class="form-grid">
            <div class="field"><label for="cs_drug">Drug</label>
              <select id="cs_drug" name="drugId" required><option value="">Select a drug</option>${drugOptions()}</select></div>
            <div class="field"><label for="cs_qty">Quantity</label>
              <input id="cs_qty" name="qty" type="number" min="1" value="1" required></div>
          </div>
          <div class="field" style="margin-top:14px;"><label for="cs_note">Note</label>
            <input id="cs_note" name="note" placeholder="Optional"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Dispense &amp; bill</button>
        </div>
      </form>
    </div>`;
  }

  function modalReceiveStock(m) {
    return `
    <div class="modal">
      <header><h3>Receive stock</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formReceive">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field"><label for="rs_drug">Drug</label>
              <select id="rs_drug" name="drugId" required><option value="">Select a drug</option>${drugOptions(m.drugId)}</select></div>
            <div class="field"><label for="rs_qty">Quantity received</label>
              <input id="rs_qty" name="qty" type="number" min="1" value="${m.qty || 1}" required></div>
            <div class="field"><label for="rs_batch">Batch number</label>
              <input id="rs_batch" name="batch" placeholder="Optional"></div>
            <div class="field"><label for="rs_expiry">Expiry date</label>
              <input id="rs_expiry" name="expiry" type="date"></div>
          </div>
          <div class="field" style="margin-top:14px;"><label for="rs_note">Note</label>
            <input id="rs_note" name="note" placeholder="Supplier or invoice reference"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Add to stock</button>
        </div>
      </form>
    </div>`;
  }

  function modalAddDrug() {
    return `
    <div class="modal">
      <header><h3>Add a drug to the catalogue</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formAddDrug">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field"><label for="ad_name">Drug name</label>
              <input id="ad_name" name="name" required placeholder="e.g. Ciprofloxacin"></div>
            <div class="field"><label for="ad_dosage">Strength</label>
              <input id="ad_dosage" name="dosage" required placeholder="e.g. 500mg"></div>
            <div class="field"><label for="ad_form">Form</label>
              <select id="ad_form" name="form">
                ${["Tablet", "Capsule", "Syrup", "Sachet", "Injection", "Cream", "Drops"].map(f => `<option>${f}</option>`).join("")}
              </select></div>
            <div class="field"><label for="ad_price">Unit price (₦)</label>
              <input id="ad_price" name="unitPrice" type="number" min="0" step="any" required></div>
            <div class="field"><label for="ad_stock">Opening stock</label>
              <input id="ad_stock" name="openingStock" type="number" min="0" value="0" required></div>
            <div class="field"><label for="ad_reorder">Reorder level</label>
              <input id="ad_reorder" name="reorderLevel" type="number" min="0" value="20" required></div>
            <div class="field"><label for="ad_batch">Batch</label>
              <input id="ad_batch" name="batch" placeholder="Optional"></div>
            <div class="field"><label for="ad_expiry">Expiry date</label>
              <input id="ad_expiry" name="expiry" type="date"></div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Add drug</button>
        </div>
      </form>
    </div>`;
  }

  function modalPayment(m) {
    const owed = m.patientId ? LL.patientSpend(m.patientId).outstanding : 0;
    return `
    <div class="modal">
      <header><h3>Record a payment</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formPayment">
        <div class="modal-body">
          <div class="field" style="margin-bottom:14px;"><label for="pm_patient">Patient</label>
            <select id="pm_patient" name="patientId" required>${patientOptions(m.patientId)}</select></div>
          <div class="form-grid">
            <div class="field"><label for="pm_amount">Amount (₦)</label>
              <input id="pm_amount" name="amount" type="number" min="1" step="any"
                     value="${owed > 0 ? owed : ""}" required>
              ${owed > 0 ? `<span class="help">This patient owes ${money(owed)}.</span>` : ""}</div>
            <div class="field"><label for="pm_method">Method</label>
              <select id="pm_method" name="method">
                ${["Cash", "POS", "Transfer", "Cheque"].map(x => `<option>${x}</option>`).join("")}
              </select></div>
          </div>
          <div class="field" style="margin-top:14px;"><label for="pm_for">What it covers</label>
            <input id="pm_for" name="forWhat" placeholder="e.g. Consultation, lab and drugs"></div>
          <p style="font-size:12.5px; color:var(--ink-faint); margin-top:14px;">
            A receipt number is generated automatically and the payment shows on the patient's
            account and in the finance records.
          </p>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Record payment</button>
        </div>
      </form>
    </div>`;
  }

  function modalExpense() {
    return `
    <div class="modal">
      <header><h3>Record an expense</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formExpense">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field"><label for="ex_cat">Category</label>
              <select id="ex_cat" name="category">
                ${["Drug purchase", "Consumables", "Salaries", "Utilities", "Rent", "Equipment", "Maintenance", "Other"]
                  .map(x => `<option>${x}</option>`).join("")}
              </select></div>
            <div class="field"><label for="ex_amount">Amount (₦)</label>
              <input id="ex_amount" name="amount" type="number" min="1" step="any" required></div>
            <div class="field"><label for="ex_date">Date</label>
              <input id="ex_date" name="date" type="date" value="${LL.todayISO()}"></div>
          </div>
          <div class="field" style="margin-top:14px;"><label for="ex_desc">Description</label>
            <input id="ex_desc" name="description" required placeholder="What the money was spent on"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Record expense</button>
        </div>
      </form>
    </div>`;
  }

  function modalCharge(m) {
    const services = LL.data().services;
    return `
    <div class="modal">
      <header><h3>Bill a service to this patient</h3><button class="x" data-action="close-modal">&times;</button></header>
      <form id="formCharge">
        <div class="modal-body">
          <div class="field" style="margin-bottom:14px;"><label for="ch_patient">Patient</label>
            <select id="ch_patient" name="patientId" required>${patientOptions(m.patientId)}</select></div>
          <div class="form-grid">
            <div class="field"><label for="ch_service">Service</label>
              <select id="ch_service" name="serviceId" required>
                ${services.map(s => `<option value="${s.id}" data-price="${s.price}">${esc(s.name)} — ${money(s.price)}</option>`).join("")}
              </select></div>
            <div class="field"><label for="ch_amount">Amount (₦)</label>
              <input id="ch_amount" name="amount" type="number" min="0" step="any" value="${services[0] ? services[0].price : 0}" required>
              <span class="help">Taken from the price list — change it if a different price was agreed.</span></div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn subtle" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Add charge</button>
        </div>
      </form>
    </div>`;
  }

  function modalPrintCard(m) {
    const p = LL.patientById(m.id);
    if (!p) return "";
    return `
    <div class="modal">
      <header><h3>Patient card</h3><button class="x no-print" data-action="close-modal">&times;</button></header>
      <div class="modal-body" style="display:grid; place-items:center;">
        ${patientCardHtml(p)}
      </div>
      <div class="modal-foot no-print">
        <button type="button" class="btn subtle" data-action="close-modal">Close</button>
        <button type="button" class="btn" data-action="do-print">${icon("print", 15)} Print</button>
      </div>
    </div>`;
  }

  function modalReceipt(m) {
    const p = LL.patientById(m.id);
    if (!p) return "";
    const meds = LL.dispensesFor(p.id);
    const s = LL.patientSpend(p.id);
    return `
    <div class="modal">
      <header><h3>Patient statement</h3><button class="x no-print" data-action="close-modal">&times;</button></header>
      <div class="modal-body">
        <div style="text-align:center; margin-bottom:18px;">
          <div style="font-family:Archivo,sans-serif; font-weight:800; font-size:17px;">LONGLIFE HOSPITAL</div>
          <div style="font-size:12px; color:var(--ink-soft);">${esc(HOSPITAL.address)}</div>
          <div class="mono" style="font-size:11px; color:var(--ink-faint);">${HOSPITAL.phones.join(" · ")}</div>
        </div>
        <div class="row" style="justify-content:space-between; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:10px 0; margin-bottom:12px;">
          <span><strong>${esc(p.name)}</strong><br>
            <span class="mono" style="font-size:12px; color:var(--ink-soft);">${esc(p.cardNo)}</span></span>
          <span style="text-align:right; font-size:12.5px; color:var(--ink-soft);">
            Printed ${esc(LL.fmtDate(LL.todayISO()))}<br>${esc(p.cardType)} card</span>
        </div>
        <table class="data" style="font-size:12.5px;">
          <thead><tr><th>Date</th><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
          <tbody>
            <tr><td class="num">${esc(LL.fmtDate(p.createdAt))}</td><td>${esc(p.cardType)} patient card</td>
              <td class="num">1</td><td class="num">${money(p.cardFee)}</td></tr>
            ${meds.map(mv => {
              const d = LL.drugById(mv.drugId);
              return `<tr><td class="num">${esc(LL.fmtDate(mv.date))}</td>
                <td>${esc(d ? d.name + " " + d.dosage : "Drug")}</td>
                <td class="num">${mv.qty}</td><td class="num">${money(mv.qty * mv.unitPrice)}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
        <div class="row" style="justify-content:space-between; margin-top:14px; border-top:2px solid var(--ink); padding-top:10px;">
          <strong>Total</strong>
          <strong class="mono" style="font-size:17px;">${money(s.total)}</strong>
        </div>
      </div>
      <div class="modal-foot no-print">
        <button type="button" class="btn subtle" data-action="close-modal">Close</button>
        <button type="button" class="btn" data-action="do-print">${icon("print", 15)} Print</button>
      </div>
    </div>`;
  }

  /* ---------- command palette ---------- */

  function paletteItems() {
    const user = LL.currentUser();
    const items = [];
    NAV.filter(n => LL.can(user, n.perm)).forEach(n =>
      items.push({ t: n.label, d: "Go to " + n.label.toLowerCase(), tag: "page", run: () => go(n.route) }));
    LL.data().patients.forEach(p =>
      items.push({ t: p.name, d: p.cardNo + " · " + p.cardType + " card", tag: "patient", run: () => go("#/app/patient/" + p.id) }));
    LL.data().drugs.forEach(d => {
      const st = LL.drugStatus(d);
      items.push({ t: d.name + " " + d.dosage, d: st.stock + " in stock · " + st.label, tag: "drug", run: () => go("#/app/pharmacy") });
    });
    if (LL.can(user, "patient.create"))
      items.push({ t: "New patient card", d: "Issue a card at the front desk", tag: "action", run: () => openModal("new-patient") });
    if (LL.can(user, "prescription.create"))
      items.push({ t: "Write prescription", d: "Send drugs to the pharmacy queue", tag: "action", run: () => openModal("new-rx", {}) });
    if (LL.can(user, "pharmacy.stock"))
      items.push({ t: "Receive stock", d: "Record drugs delivered by a supplier", tag: "action", run: () => openModal("receive-stock", {}) });
    items.push({ t: "Sign out", d: "End this session", tag: "action", run: doLogout });
    return items;
  }

  function openPalette() {
    state.palette = true;
    state.paletteSel = 0;
    const wrap = document.createElement("div");
    wrap.className = "palette-backdrop";
    wrap.innerHTML = `
      <div class="palette">
        <input id="paletteInput" placeholder="Search patients, drugs, pages or actions…" autocomplete="off">
        <div class="results" id="paletteResults"></div>
      </div>`;
    document.body.appendChild(wrap);
    document.getElementById("paletteInput").focus();
    paintPalette("");
  }

  function closePalette() {
    state.palette = false;
    const el = document.querySelector(".palette-backdrop");
    if (el) el.remove();
  }

  function filteredPalette(q) {
    const query = q.trim().toLowerCase();
    const all = paletteItems();
    if (!query) return all.slice(0, 8);
    return all.filter(i => (i.t + " " + i.d).toLowerCase().includes(query)).slice(0, 12);
  }

  function paintPalette(q) {
    const list = filteredPalette(q);
    const box = document.getElementById("paletteResults");
    if (!box) return;
    if (state.paletteSel >= list.length) state.paletteSel = Math.max(0, list.length - 1);
    box.innerHTML = list.length ? list.map((i, idx) => `
      <button class="res ${idx === state.paletteSel ? "sel" : ""}" data-palette-index="${idx}">
        <span><span class="t">${esc(i.t)}</span><br><span class="d">${esc(i.d)}</span></span>
        <span class="tag">${esc(i.tag)}</span>
      </button>`).join("") : `<div class="empty">Nothing matches that.</div>`;
    box._list = list;
  }

  function runPalette(idx) {
    const box = document.getElementById("paletteResults");
    const list = (box && box._list) || [];
    const item = list[idx];
    closePalette();
    if (item) item.run();
  }

  /* ---------- actions ---------- */

  function doLogout() {
    const u = LL.currentUser();
    LL.logActivity(u, "Signed out", u ? u.name + " ended the session" : "");
    LL.save();
    LL.logout();
    go("#/login");
    render();
    toast("Signed out.");
  }

  function dispense(rxId) {
    const user = LL.currentUser();
    const res = LL.dispensePrescription(rxId, user);
    if (!res.ok) {
      const why = res.blocked.map(b => (b.drug ? b.drug + ": " : "") + b.reason).join("; ");
      toast("Cannot dispense — " + why, "crit");
      render();
      return;
    }
    toast("Dispensed and billed to the patient's card — " + money(res.total), "good");
    render();
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportCsv(filename, rows) {
    const csv = LL.csvOf(rows);
    if (window.claude && typeof window.claude.use === "function") {
      try {
        const dl = await window.claude.use("downloads");
        if (dl) {
          try {
            await dl.save({ filename, data: csv });
            toast("Exported " + filename, "good");
            return;
          } catch (err) {
            if (err && err.code === "declined") return;
            if (err && err.code === "extension_not_enabled") {
              try {
                await dl.save({ filename: filename.replace(/\.csv$/, ".txt"), data: csv });
                toast("Exported as .txt", "good");
                return;
              } catch (e2) { /* fall through */ }
            }
          }
        }
      } catch (e) { /* fall through to anchor download */ }
    }
    download(filename, csv);
    toast("Exported " + filename, "good");
  }

  /* ---------- event wiring ---------- */

  document.addEventListener("click", function (ev) {
    const el = ev.target.closest("[data-action]");
    const pal = ev.target.closest("[data-palette-index]");

    if (pal) { runPalette(Number(pal.getAttribute("data-palette-index"))); return; }

    if (!el) {
      if (ev.target.classList && ev.target.classList.contains("modal-backdrop")) closeModal();
      if (ev.target.classList && ev.target.classList.contains("palette-backdrop")) closePalette();
      return;
    }

    const action = el.getAttribute("data-action");
    const user = LL.currentUser();

    switch (action) {
      case "fill-login": {
        const u = el.getAttribute("data-user");
        document.getElementById("loginUser").value = u;
        document.getElementById("loginPin").value = "1234";
        document.getElementById("loginPin").focus();
        break;
      }
      case "logout": doLogout(); break;
      case "open-palette": openPalette(); break;
      case "close-modal": closeModal(); break;
      case "do-print": window.print(); break;
      case "new-patient": openModal("new-patient"); break;
      case "new-rx": openModal("new-rx", { patientId: el.getAttribute("data-patient") || "" }); break;
      case "new-vitals": openModal("new-vitals", { patientId: el.getAttribute("data-patient") || "" }); break;
      case "counter-sale": openModal("counter-sale", { patientId: el.getAttribute("data-patient") || "" }); break;
      case "receive-stock": openModal("receive-stock", {
        drugId: el.getAttribute("data-drug") || "", qty: el.getAttribute("data-qty") || 1
      }); break;
      case "add-drug": openModal("add-drug"); break;
      case "record-payment": openModal("record-payment", { patientId: el.getAttribute("data-patient") || "" }); break;
      case "add-expense": openModal("add-expense"); break;
      case "add-charge": openModal("add-charge", { patientId: el.getAttribute("data-patient") || "" }); break;

      case "quote-print": window.print(); break;
      case "quote-clear": {
        state.quote = {};
        state.quoteNo = null;
        render();
        toast("Estimate cleared.");
        break;
      }
      case "quote-email": {
        const lines = quoteLines();
        if (!lines.length) { toast("Pick at least one service or medicine first.", "warn"); break; }
        const to = (document.getElementById("q_email") || {}).value || "";
        const subject = "Longlife Hospital cost estimate " + quoteNo();
        const href = "mailto:" + encodeURIComponent(to) +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(quoteText()) +
          "&cc=" + encodeURIComponent(HOSPITAL.email);
        window.location.href = href;
        toast(to ? "Opening your email app…" : "Opening your email app — add the address there.", "good");
        break;
      }

      case "print-card": openModal("print-card", { id: el.getAttribute("data-id") }); break;
      case "print-receipt": openModal("print-receipt", { id: el.getAttribute("data-id") }); break;
      case "dispense-rx": dispense(el.getAttribute("data-id")); break;

      case "rx-add-item": {
        collectRxItems();
        state.rxItems.push({ drugId: "", qty: 1, instruction: "" });
        const box = document.getElementById("rxItems");
        box.innerHTML = state.rxItems.map((it, i) => rxItemRow(it, i)).join("");
        break;
      }
      case "rx-remove-item": {
        collectRxItems();
        const i = Number(el.getAttribute("data-index"));
        if (state.rxItems.length > 1) state.rxItems.splice(i, 1);
        const box2 = document.getElementById("rxItems");
        box2.innerHTML = state.rxItems.map((it, k) => rxItemRow(it, k)).join("");
        break;
      }

      case "export-ledger": {
        const rows = [["Date", "Type", "Drug", "Dosage", "Qty", "Unit price", "Value", "Patient", "Card no", "Staff", "Note"]];
        LL.data().movements.forEach(m => {
          const d = LL.drugById(m.drugId);
          const p = m.patientId ? LL.patientById(m.patientId) : null;
          rows.push([m.date, m.type === "IN" ? "Stock in" : "Dispensed", d ? d.name : "", d ? d.dosage : "",
            m.qty, m.unitPrice, m.qty * m.unitPrice, p ? p.name : "", p ? p.cardNo : "", m.staffName, m.note || ""]);
        });
        exportCsv("longlife-stock-ledger-" + LL.todayISO() + ".csv", rows);
        break;
      }
      case "export-reorder": {
        const rows = [["Drug", "Dosage", "In stock", "Reorder level", "Suggested order", "Unit price", "Estimated cost"]];
        LL.data().drugs.filter(d => ["low", "out"].includes(LL.drugStatus(d).key)).forEach(d => {
          const q = LL.suggestedOrder(d);
          rows.push([d.name, d.dosage, LL.stockOf(d.id), d.reorderLevel, q, d.unitPrice, q * d.unitPrice]);
        });
        exportCsv("longlife-reorder-" + LL.todayISO() + ".csv", rows);
        break;
      }
      case "export-patients": {
        const rows = [["Card no", "Patient", "Sex", "Age", "Phone", "Card type", "Card fee", "Drugs billed", "Total billed", "Issued", "Issued by"]];
        LL.data().patients.forEach(p => {
          const s = LL.patientSpend(p.id);
          rows.push([p.cardNo, p.name, p.sex, p.age, p.phone, p.cardType, p.cardFee, s.drugs, s.total,
            String(p.createdAt).slice(0, 10), p.createdBy]);
        });
        exportCsv("longlife-patients-" + LL.todayISO() + ".csv", rows);
        break;
      }
      case "export-dispensing": {
        const rows = [["Drug", "Dosage", "Units dispensed", "Value"]];
        LL.data().drugs.forEach(d => {
          const s = LL.data().movements.filter(m => m.type === "OUT" && m.drugId === d.id)
            .reduce((acc, m) => ({ q: acc.q + m.qty, v: acc.v + m.qty * m.unitPrice }), { q: 0, v: 0 });
          if (s.q) rows.push([d.name, d.dosage, s.q, s.v]);
        });
        exportCsv("longlife-dispensing-" + LL.todayISO() + ".csv", rows);
        break;
      }
      case "export-finance": {
        const f = LL.finance();
        const rows = [["Longlife Hospital finance records", "generated " + LL.fmtDate(LL.todayISO())], [],
          ["Summary", "Amount (NGN)"],
          ["Billed — patient cards", f.cardsBilled],
          ["Billed — services", f.servicesBilled],
          ["Billed — drugs", f.drugsBilled],
          ["Billed — total", f.billed],
          ["Received", f.received],
          ["Outstanding", f.outstanding],
          ["Spent", f.spent],
          ["Net position", f.net],
          [], ["Payments"],
          ["Receipt", "When", "Patient", "For", "Method", "Amount", "Received by"]];
        LL.data().payments.forEach(p => rows.push([p.ref, p.at, p.patientName, p.forWhat, p.method, p.amount, p.staffName]));
        rows.push([], ["Expenses"], ["Date", "Category", "Description", "Amount", "Recorded by"]);
        LL.data().expenses.forEach(e => rows.push([e.date, e.category, e.description, e.amount, e.staffName]));
        rows.push([], ["Outstanding accounts"], ["Card no", "Patient", "Billed", "Paid", "Outstanding"]);
        f.debtors.forEach(x => rows.push([x.patient.cardNo, x.patient.name, x.billed, x.paid, x.outstanding]));
        exportCsv("longlife-finance-" + LL.todayISO() + ".csv", rows);
        break;
      }
      case "export-audit": {
        const rows = [["When", "Staff", "Role", "Action", "Detail"]];
        LL.data().activity.forEach(a => rows.push([a.at, a.userName, a.role, a.action, a.detail]));
        exportCsv("longlife-audit-" + LL.todayISO() + ".csv", rows);
        break;
      }
      default: break;
    }
  });

  function collectRxItems() {
    const rows = document.querySelectorAll("#rxItems .rx-item");
    if (!rows.length) return;
    state.rxItems = Array.from(rows).map(r => ({
      drugId: r.querySelector('[name="drugId"]').value,
      qty: r.querySelector('[name="qty"]').value,
      instruction: r.querySelector('[name="instruction"]').value
    }));
  }

  document.addEventListener("submit", function (ev) {
    const form = ev.target;
    const user = LL.currentUser();

    if (form.id === "loginForm") {
      ev.preventDefault();
      const fd = new FormData(form);
      const u = LL.login(fd.get("username"), fd.get("pin"));
      const box = document.getElementById("loginError");
      if (!u) {
        box.innerHTML = `<div class="auth-error">That username and PIN do not match a staff account. Try one of the demonstration accounts below.</div>`;
        return;
      }
      LL.logActivity(u, "Signed in", u.name + " (" + LL.ROLES[u.role].label + ")");
      LL.save();
      go("#/app/dashboard");
      render();
      toast("Welcome, " + u.name.split(" ").slice(-1)[0] + ".", "good");
      return;
    }

    if (form.id === "formNewPatient") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const p = LL.createPatient(fd, user);
      closeModal();
      render();
      toast("Card " + p.cardNo + " issued to " + p.name + ".", "good");
      openModal("print-card", { id: p.id });
      return;
    }

    if (form.id === "formNewRx") {
      ev.preventDefault();
      collectRxItems();
      const fd = Object.fromEntries(new FormData(form).entries());
      const items = state.rxItems.filter(i => i.drugId && Number(i.qty) > 0);
      if (!items.length) { toast("Add at least one drug to the prescription.", "warn"); return; }
      LL.createPrescription({ patientId: fd.patientId, diagnosis: fd.diagnosis, items }, user);
      closeModal();
      render();
      toast("Prescription sent to the pharmacy queue.", "good");
      return;
    }

    if (form.id === "formVitals") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      LL.recordVitals(fd, user);
      closeModal();
      render();
      toast("Vitals recorded.", "good");
      return;
    }

    if (form.id === "formCounter") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const res = LL.dispenseDirect(fd, user);
      if (!res.ok) {
        toast("Cannot dispense — " + res.blocked.map(b => (b.drug ? b.drug + ": " : "") + b.reason).join("; "), "crit");
        return;
      }
      closeModal();
      render();
      toast("Dispensed and billed — " + money(res.total), "good");
      return;
    }

    if (form.id === "formReceive") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const res = LL.receiveStock(fd, user);
      if (!res.ok) { toast("Select a drug and a quantity of at least 1.", "warn"); return; }
      closeModal();
      render();
      toast("Stock received and added to the ledger.", "good");
      return;
    }

    if (form.id === "formPayment") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const res = LL.recordPayment(fd, user);
      if (!res.ok) { toast("Select a patient and an amount above zero.", "warn"); return; }
      closeModal();
      render();
      toast("Payment " + res.payment.ref + " recorded — " + money(res.payment.amount), "good");
      return;
    }

    if (form.id === "formExpense") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const res = LL.addExpense(fd, user);
      if (!res.ok) { toast("Enter a description and an amount above zero.", "warn"); return; }
      closeModal();
      render();
      toast("Expense recorded.", "good");
      return;
    }

    if (form.id === "formCharge") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const res = LL.addCharge(fd, user);
      if (!res.ok) { toast("Select a patient and a service.", "warn"); return; }
      closeModal();
      render();
      toast(res.charge.name + " billed — " + money(res.charge.amount), "good");
      return;
    }

    if (form.id === "formAddDrug") {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const d = LL.addDrug(fd, user);
      closeModal();
      render();
      toast(d.name + " added to the catalogue.", "good");
      return;
    }
  });

  // quote picker: ticking an item adds it, the number beside it sets quantity
  document.addEventListener("change", function (ev) {
    const pick = ev.target.closest("[data-quote-pick]");
    if (pick) {
      const key = pick.getAttribute("data-kind") + ":" + pick.getAttribute("data-id");
      const row = pick.closest(".quote-row");
      const qtyInput = row.querySelector("[data-quote-qty]");
      if (pick.checked) {
        state.quote[key] = { qty: Math.max(1, Number(qtyInput.value) || 1) };
        qtyInput.disabled = false;
        row.classList.add("on");
      } else {
        delete state.quote[key];
        qtyInput.disabled = true;
        row.classList.remove("on");
      }
      paintQuote();
    }
  });

  document.addEventListener("input", function (ev) {
    const qty = ev.target.closest("[data-quote-qty]");
    if (qty) {
      const key = qty.getAttribute("data-kind") + ":" + qty.getAttribute("data-id");
      if (state.quote[key]) {
        state.quote[key].qty = Math.max(1, Number(qty.value) || 1);
        paintQuote();
      }
      return;
    }
    if (ev.target.id === "q_name") { paintQuote(); return; }
    if (ev.target.id === "quoteSearch") {
      const q = ev.target.value.trim().toLowerCase();
      document.querySelectorAll("[data-quote-row]").forEach(row => {
        row.style.display = !q || row.getAttribute("data-search").includes(q) ? "" : "none";
      });
      document.querySelectorAll(".quote-group").forEach(g => {
        const anyVisible = Array.from(g.querySelectorAll("[data-quote-row]")).some(r => r.style.display !== "none");
        g.style.display = anyVisible ? "" : "none";
      });
      return;
    }
  });

  // patient search filter + card-type fee autofill
  document.addEventListener("input", function (ev) {
    if (ev.target.id === "patientSearch") {
      const q = ev.target.value.trim().toLowerCase();
      document.querySelectorAll("[data-patient-row]").forEach(row => {
        row.style.display = !q || row.getAttribute("data-search").includes(q) ? "" : "none";
      });
    }
    if (ev.target.id === "paletteInput") {
      state.paletteSel = 0;
      paintPalette(ev.target.value);
    }
  });

  document.addEventListener("change", function (ev) {
    if (ev.target.id === "np_type") {
      const fee = ev.target.selectedOptions[0].getAttribute("data-fee");
      const input = document.getElementById("np_fee");
      if (fee && input) input.value = fee;
    }
    if (ev.target.id === "ch_service") {
      const price = ev.target.selectedOptions[0].getAttribute("data-price");
      const input = document.getElementById("ch_amount");
      if (price && input) input.value = price;
    }
    if (ev.target.id === "pm_patient") {
      const owed = LL.patientSpend(ev.target.value).outstanding;
      const input = document.getElementById("pm_amount");
      if (input) input.value = owed > 0 ? owed : "";
    }
  });

  document.addEventListener("keydown", function (ev) {
    const k = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && k === "k") {
      ev.preventDefault();
      if (!LL.currentUser()) return;
      state.palette ? closePalette() : openPalette();
      return;
    }
    if (ev.key === "Escape") {
      if (state.palette) closePalette();
      else if (state.modal) closeModal();
      return;
    }
    if (state.palette) {
      const box = document.getElementById("paletteResults");
      const list = (box && box._list) || [];
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        state.paletteSel = Math.min(state.paletteSel + 1, list.length - 1);
        paintPalette(document.getElementById("paletteInput").value);
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        state.paletteSel = Math.max(state.paletteSel - 1, 0);
        paintPalette(document.getElementById("paletteInput").value);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        runPalette(state.paletteSel);
      }
    }
  });

  function wireChart() { /* chart hover is CSS-driven; hook kept for future interactions */ }

  window.addEventListener("hashchange", render);

  // expose a tiny surface for tests and debugging
  window.LLApp = { render, toast, openModal, closeModal, go, dispense };

  render();
})();

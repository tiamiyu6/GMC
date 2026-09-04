/* ==========================================================================
   Longlife Hospital — Care System data layer
   Store, models, role permissions, seed data and derived queries.

   NOTE ON SECURITY: this is a browser-only demonstration system. All data
   lives in this browser's localStorage and the "login" is a front-desk role
   switch, not real authentication — PINs are stored in plain text and any
   user of this browser can read or change the data. Do not put real patient
   records in it without a proper server, database and authentication.
   ========================================================================== */

const LL = (function () {
  "use strict";

  const STORAGE_KEY = "longlife_care_system_v1";
  const SESSION_KEY = "longlife_care_session_v1";

  /* ---------- small helpers ---------- */

  const uid = (p) => (p || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const nowISO = () => new Date().toISOString();

  function daysBetween(fromISO, toISO) {
    const a = new Date(fromISO + (fromISO.length === 10 ? "T00:00:00" : ""));
    const b = new Date(toISO + (toISO.length === 10 ? "T00:00:00" : ""));
    return Math.round((a - b) / 86400000);
  }

  function money(n) {
    return "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function moneyShort(n) {
    const v = Number(n || 0);
    if (v >= 1000000) return "₦" + (v / 1000000).toFixed(1) + "m";
    if (v >= 1000) return "₦" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
    return "₦" + v.toFixed(0);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- roles ---------- */

  const ROLES = {
    doctor: {
      label: "Doctor",
      blurb: "Consult, review history, write prescriptions",
      perms: ["dashboard", "patients", "patient.create", "patient.view", "prescriptions", "prescription.create", "vitals", "pharmacy.view", "reports"]
    },
    nurse: {
      label: "Nurse",
      blurb: "Register patients, issue cards, record vitals",
      perms: ["dashboard", "patients", "patient.create", "patient.view", "vitals", "vitals.create", "prescriptions", "reports"]
    },
    pharmacist: {
      label: "Pharmacist",
      blurb: "Dispense prescriptions, manage drug stock",
      perms: ["dashboard", "patients", "patient.view", "prescriptions", "pharmacy", "pharmacy.view", "pharmacy.dispense", "pharmacy.stock", "reports"]
    },
    admin: {
      label: "Admin",
      blurb: "Full oversight, staff and audit trail",
      perms: ["dashboard", "patients", "patient.create", "patient.view", "prescriptions", "prescription.create", "vitals", "vitals.create",
        "pharmacy", "pharmacy.view", "pharmacy.dispense", "pharmacy.stock", "reports", "staff", "audit"]
    }
  };

  function can(user, perm) {
    if (!user) return false;
    const role = ROLES[user.role];
    return !!role && role.perms.includes(perm);
  }

  /* ---------- seed ---------- */

  function seed() {
    const t = todayISO();
    const dayOffset = (n) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const stampOffset = (mins) => new Date(Date.now() - mins * 60000).toISOString();

    const users = [
      { id: "u_doc1", username: "dr.adeyemi", pin: "1234", name: "Dr. Ifeoluwa Adeyemi", role: "doctor", title: "Medical Officer" },
      { id: "u_nur1", username: "nurse.ada", pin: "1234", name: "Nurse Adaeze Okonkwo", role: "nurse", title: "Senior Nurse" },
      { id: "u_pha1", username: "pharm.grace", pin: "1234", name: "Pharm. Grace Bello", role: "pharmacist", title: "Superintendent Pharmacist" },
      { id: "u_adm1", username: "admin", pin: "1234", name: "Tunde Ajayi", role: "admin", title: "Facility Administrator" }
    ];

    const drugs = [
      { id: "d_para", name: "Paracetamol", dosage: "500mg", form: "Tablet", unitPrice: 150, openingStock: 240, reorderLevel: 60, expiry: dayOffset(420), batch: "PC-2418" },
      { id: "d_amox", name: "Amoxicillin", dosage: "250mg", form: "Capsule", unitPrice: 320, openingStock: 90, reorderLevel: 40, expiry: dayOffset(210), batch: "AM-1180" },
      { id: "d_arte", name: "Artemether/Lumefantrine", dosage: "20/120mg", form: "Tablet", unitPrice: 1800, openingStock: 48, reorderLevel: 20, expiry: dayOffset(300), batch: "AL-7702" },
      { id: "d_metr", name: "Metronidazole", dosage: "400mg", form: "Tablet", unitPrice: 120, openingStock: 30, reorderLevel: 50, expiry: dayOffset(150), batch: "MT-3391" },
      { id: "d_ors", name: "Oral Rehydration Salt", dosage: "20.5g", form: "Sachet", unitPrice: 250, openingStock: 120, reorderLevel: 30, expiry: dayOffset(60), batch: "OR-5540" },
      { id: "d_ibu", name: "Ibuprofen", dosage: "400mg", form: "Tablet", unitPrice: 200, openingStock: 60, reorderLevel: 25, expiry: dayOffset(-20), batch: "IB-2210" },
      { id: "d_fesu", name: "Ferrous Sulphate", dosage: "200mg", form: "Tablet", unitPrice: 90, openingStock: 150, reorderLevel: 40, expiry: dayOffset(500), batch: "FS-9013" },
      { id: "d_vitc", name: "Vitamin C", dosage: "100mg", form: "Tablet", unitPrice: 60, openingStock: 200, reorderLevel: 50, expiry: dayOffset(365), batch: "VC-6621" }
    ];

    const patients = [
      { id: "p_1", cardNo: "LLH-26-0001", name: "John Okafor", sex: "Male", age: 34, phone: "0803-441-2210", address: "12 Ilupeju Street, Oshodi", bloodGroup: "O+", nextOfKin: "Chioma Okafor · 0803-441-2299", cardType: "Standard", cardFee: 2000, createdAt: stampOffset(60 * 24 * 26), createdBy: "Nurse Adaeze Okonkwo", createdById: "u_nur1", expiresAt: dayOffset(339), status: "Active" },
      { id: "p_2", cardNo: "LLH-26-0002", name: "Mary Sunday", sex: "Female", age: 27, phone: "0812-770-6654", address: "5 Owoseni Street, Oshodi", bloodGroup: "A+", nextOfKin: "Peter Sunday · 0812-770-6600", cardType: "Antenatal", cardFee: 3500, createdAt: stampOffset(60 * 24 * 12), createdBy: "Nurse Adaeze Okonkwo", createdById: "u_nur1", expiresAt: dayOffset(353), status: "Active" },
      { id: "p_3", cardNo: "LLH-26-0003", name: "Tunde Bello", sex: "Male", age: 52, phone: "0705-118-9034", address: "38 Bolade Avenue, Oshodi", bloodGroup: "B+", nextOfKin: "Bisi Bello · 0705-118-9000", cardType: "Standard", cardFee: 2000, createdAt: stampOffset(60 * 24 * 4), createdBy: "Nurse Adaeze Okonkwo", createdById: "u_nur1", expiresAt: dayOffset(361), status: "Active" },
      { id: "p_4", cardNo: "LLH-26-0004", name: "Blessing Eze", sex: "Female", age: 8, phone: "0902-334-7781", address: "77 Church Street, Isolo", bloodGroup: "O-", nextOfKin: "Ngozi Eze · 0902-334-7700", cardType: "Child", cardFee: 1500, createdAt: stampOffset(180), createdBy: "Nurse Adaeze Okonkwo", createdById: "u_nur1", expiresAt: dayOffset(365), status: "Active" }
    ];

    const vitals = [
      { id: "v_1", patientId: "p_1", bp: "128/84", temp: 37.4, pulse: 82, weight: 76, takenBy: "Nurse Adaeze Okonkwo", at: stampOffset(150), note: "Complains of headache and body pain" },
      { id: "v_2", patientId: "p_3", bp: "146/92", temp: 36.9, pulse: 88, weight: 84, takenBy: "Nurse Adaeze Okonkwo", at: stampOffset(120), note: "Elevated BP, for review" },
      { id: "v_3", patientId: "p_4", bp: "100/64", temp: 38.6, pulse: 104, weight: 22, takenBy: "Nurse Adaeze Okonkwo", at: stampOffset(90), note: "Fever since yesterday" }
    ];

    const prescriptions = [
      {
        id: "rx_1", patientId: "p_1", doctorId: "u_doc1", doctorName: "Dr. Ifeoluwa Adeyemi",
        at: stampOffset(140), status: "dispensed", diagnosis: "Malaria (uncomplicated)",
        items: [
          { drugId: "d_arte", qty: 1, instruction: "1 tablet twice daily for 3 days" },
          { drugId: "d_para", qty: 12, instruction: "2 tablets every 8 hours after food" }
        ]
      },
      {
        id: "rx_2", patientId: "p_4", doctorId: "u_doc1", doctorName: "Dr. Ifeoluwa Adeyemi",
        at: stampOffset(80), status: "pending", diagnosis: "Acute gastroenteritis",
        items: [
          { drugId: "d_ors", qty: 6, instruction: "1 sachet in 1 litre of water after each loose stool" },
          { drugId: "d_para", qty: 9, instruction: "Half tablet every 8 hours" }
        ]
      },
      {
        id: "rx_3", patientId: "p_3", doctorId: "u_doc1", doctorName: "Dr. Ifeoluwa Adeyemi",
        at: stampOffset(60), status: "pending", diagnosis: "Hypertension review",
        items: [
          { drugId: "d_vitc", qty: 30, instruction: "1 tablet daily" }
        ]
      }
    ];

    // Ledger: every stock movement. OUT rows are dispenses tied to a patient.
    const movements = [
      { id: "m_1", drugId: "d_para", type: "IN", qty: 100, unitPrice: 150, date: dayOffset(-9), at: stampOffset(60 * 24 * 9), staffId: "u_pha1", staffName: "Pharm. Grace Bello", note: "Supplier delivery" },
      { id: "m_2", drugId: "d_amox", type: "IN", qty: 40, unitPrice: 320, date: dayOffset(-6), at: stampOffset(60 * 24 * 6), staffId: "u_pha1", staffName: "Pharm. Grace Bello", note: "Supplier delivery" },
      { id: "m_3", drugId: "d_arte", type: "OUT", qty: 1, unitPrice: 1800, date: t, at: stampOffset(135), staffId: "u_pha1", staffName: "Pharm. Grace Bello", patientId: "p_1", patientName: "John Okafor", prescriptionId: "rx_1" },
      { id: "m_4", drugId: "d_para", type: "OUT", qty: 12, unitPrice: 150, date: t, at: stampOffset(135), staffId: "u_pha1", staffName: "Pharm. Grace Bello", patientId: "p_1", patientName: "John Okafor", prescriptionId: "rx_1" },
      { id: "m_5", drugId: "d_amox", type: "OUT", qty: 15, unitPrice: 320, date: dayOffset(-2), at: stampOffset(60 * 24 * 2), staffId: "u_pha1", staffName: "Pharm. Grace Bello", patientId: "p_2", patientName: "Mary Sunday", note: "Over-the-counter sale" },
      { id: "m_6", drugId: "d_fesu", type: "OUT", qty: 30, unitPrice: 90, date: dayOffset(-1), at: stampOffset(60 * 30), staffId: "u_pha1", staffName: "Pharm. Grace Bello", patientId: "p_2", patientName: "Mary Sunday", note: "Antenatal supplement" },
      { id: "m_7", drugId: "d_metr", type: "OUT", qty: 20, unitPrice: 120, date: dayOffset(-3), at: stampOffset(60 * 24 * 3), staffId: "u_pha1", staffName: "Pharm. Grace Bello", patientId: "p_3", patientName: "Tunde Bello" }
    ];

    const activity = [
      { id: "a_1", at: stampOffset(135), userId: "u_pha1", userName: "Pharm. Grace Bello", role: "pharmacist", action: "Dispensed prescription", detail: "RX for John Okafor (LLH-26-0001) — 2 item(s)" },
      { id: "a_2", at: stampOffset(140), userId: "u_doc1", userName: "Dr. Ifeoluwa Adeyemi", role: "doctor", action: "Wrote prescription", detail: "John Okafor — Malaria (uncomplicated)" },
      { id: "a_3", at: stampOffset(180), userId: "u_nur1", userName: "Nurse Adaeze Okonkwo", role: "nurse", action: "Issued patient card", detail: "Blessing Eze — LLH-26-0004 (₦1,500.00)" }
    ];

    return { users, drugs, patients, vitals, prescriptions, movements, activity, cardCounter: 4 };
  }

  /* ---------- store ---------- */

  let db = null;

  function load() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        db = JSON.parse(raw);
        // forward-compatible defaults
        ["users", "drugs", "patients", "vitals", "prescriptions", "movements", "activity"].forEach(k => {
          if (!Array.isArray(db[k])) db[k] = [];
        });
        if (typeof db.cardCounter !== "number") db.cardCounter = db.patients.length;
        return db;
      }
    } catch (e) { /* corrupt or unavailable storage — fall back to a fresh seed */ }
    db = seed();
    save();
    return db;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) { /* storage full or blocked — the session continues in memory */ }
  }

  function reset() {
    db = seed();
    save();
    return db;
  }

  function data() { return load(); }

  /* ---------- session ---------- */

  function login(username, pin) {
    const u = load().users.find(x =>
      x.username.toLowerCase() === String(username || "").trim().toLowerCase() &&
      x.pin === String(pin || "").trim());
    if (!u) return null;
    try { sessionStorageSet(u.id); } catch (e) { /* ignore */ }
    return u;
  }

  function sessionStorageSet(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, at: nowISO() }));
  }

  function currentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return load().users.find(u => u.id === s.userId) || null;
    } catch (e) { return null; }
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  /* ---------- derived queries ---------- */

  function stockOf(drugId) {
    const d = load().drugs.find(x => x.id === drugId);
    if (!d) return 0;
    return load().movements.reduce((n, m) => {
      if (m.drugId !== drugId) return n;
      return n + (m.type === "IN" ? m.qty : -m.qty);
    }, Number(d.openingStock) || 0);
  }

  function drugStatus(drug) {
    const stock = stockOf(drug.id);
    const expiryDays = drug.expiry ? daysBetween(drug.expiry, todayISO()) : null;
    if (expiryDays !== null && expiryDays < 0) return { key: "expired", label: "Expired", cls: "crit", stock, expiryDays };
    if (stock <= 0) return { key: "out", label: "Out of stock", cls: "crit", stock, expiryDays };
    if (stock <= Number(drug.reorderLevel || 0)) return { key: "low", label: "Low stock", cls: "warn", stock, expiryDays };
    if (expiryDays !== null && expiryDays <= 90) return { key: "expiring", label: "Expiring soon", cls: "warn", stock, expiryDays };
    return { key: "ok", label: "In stock", cls: "good", stock, expiryDays };
  }

  function patientById(id) { return load().patients.find(p => p.id === id) || null; }
  function drugById(id) { return load().drugs.find(d => d.id === id) || null; }
  function userById(id) { return load().users.find(u => u.id === id) || null; }

  function dispensesFor(patientId) {
    return load().movements
      .filter(m => m.type === "OUT" && m.patientId === patientId)
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  function patientSpend(patientId) {
    const p = patientById(patientId);
    const drugs = dispensesFor(patientId).reduce((n, m) => n + m.qty * m.unitPrice, 0);
    const card = Number(p && p.cardFee) || 0;
    return { drugs, card, total: drugs + card };
  }

  function prescriptionsFor(patientId) {
    return load().prescriptions
      .filter(r => r.patientId === patientId)
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  function vitalsFor(patientId) {
    return load().vitals
      .filter(v => v.patientId === patientId)
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  function pendingPrescriptions() {
    return load().prescriptions
      .filter(r => r.status === "pending")
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  function alerts() {
    const out = [];
    load().drugs.forEach(d => {
      const st = drugStatus(d);
      if (st.key === "expired") {
        out.push({ level: "crit", title: `${d.name} ${d.dosage} has expired`, detail: `Batch ${d.batch} expired ${fmtDate(d.expiry)} — quarantine ${st.stock} unit(s).`, drugId: d.id });
      } else if (st.key === "out") {
        out.push({ level: "crit", title: `${d.name} ${d.dosage} is out of stock`, detail: "Dispensing is blocked until stock is received.", drugId: d.id });
      } else if (st.key === "low") {
        out.push({ level: "warn", title: `${d.name} ${d.dosage} is low`, detail: `${st.stock} left, reorder level ${d.reorderLevel}. Suggested order: ${suggestedOrder(d)} unit(s).`, drugId: d.id });
      } else if (st.key === "expiring") {
        out.push({ level: "warn", title: `${d.name} ${d.dosage} expires in ${st.expiryDays} day(s)`, detail: `Batch ${d.batch} — use or return ${st.stock} unit(s) before ${fmtDate(d.expiry)}.`, drugId: d.id });
      }
    });
    const pending = pendingPrescriptions().length;
    if (pending) {
      out.push({ level: "warn", title: `${pending} prescription(s) waiting at the pharmacy`, detail: "Patients are waiting to collect their drugs.", route: "#/app/queue" });
    }
    load().patients.forEach(p => {
      if (p.expiresAt && daysBetween(p.expiresAt, todayISO()) < 0) {
        out.push({ level: "warn", title: `${p.name}'s card has expired`, detail: `Card ${p.cardNo} expired ${fmtDate(p.expiresAt)} — renew at the front desk.`, patientId: p.id });
      }
    });
    const order = { crit: 0, warn: 1, good: 2 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }

  function suggestedOrder(drug) {
    const stock = stockOf(drug.id);
    const target = Math.max(Number(drug.reorderLevel || 0) * 3, 30);
    return Math.max(target - stock, 0);
  }

  function revenueByDay(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const total = load().movements
        .filter(m => m.type === "OUT" && m.date === iso)
        .reduce((n, m) => n + m.qty * m.unitPrice, 0);
      out.push({ date: iso, label: d.toLocaleDateString("en-NG", { weekday: "short" }), total });
    }
    return out;
  }

  function totals() {
    const d = load();
    const dispensed = d.movements.filter(m => m.type === "OUT");
    const drugRevenue = dispensed.reduce((n, m) => n + m.qty * m.unitPrice, 0);
    const cardRevenue = d.patients.reduce((n, p) => n + (Number(p.cardFee) || 0), 0);
    const stockValue = d.drugs.reduce((n, x) => n + stockOf(x.id) * x.unitPrice, 0);
    const today = todayISO();
    return {
      patients: d.patients.length,
      newCardsToday: d.patients.filter(p => String(p.createdAt).slice(0, 10) === today).length,
      drugRevenue,
      cardRevenue,
      revenue: drugRevenue + cardRevenue,
      revenueToday: dispensed.filter(m => m.date === today).reduce((n, m) => n + m.qty * m.unitPrice, 0),
      stockValue,
      drugs: d.drugs.length,
      outOfStock: d.drugs.filter(x => drugStatus(x).key === "out").length,
      lowStock: d.drugs.filter(x => drugStatus(x).key === "low").length,
      expiring: d.drugs.filter(x => ["expiring", "expired"].includes(drugStatus(x).key)).length,
      pending: pendingPrescriptions().length,
      dispensedToday: dispensed.filter(m => m.date === today).length
    };
  }

  /* ---------- writes ---------- */

  function logActivity(user, action, detail) {
    load().activity.unshift({
      id: uid("a"), at: nowISO(), userId: user ? user.id : null,
      userName: user ? user.name : "System", role: user ? user.role : "system", action, detail
    });
    if (db.activity.length > 300) db.activity.length = 300;
  }

  function nextCardNo() {
    const d = load();
    d.cardCounter = (Number(d.cardCounter) || 0) + 1;
    const yy = String(new Date().getFullYear()).slice(2);
    return "LLH-" + yy + "-" + String(d.cardCounter).padStart(4, "0");
  }

  function createPatient(input, user) {
    const d = load();
    const cardNo = nextCardNo();
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const patient = {
      id: uid("p"),
      cardNo,
      name: input.name,
      sex: input.sex,
      age: Number(input.age) || 0,
      phone: input.phone || "",
      address: input.address || "",
      bloodGroup: input.bloodGroup || "",
      nextOfKin: input.nextOfKin || "",
      cardType: input.cardType || "Standard",
      cardFee: Number(input.cardFee) || 0,
      createdAt: nowISO(),
      createdBy: user ? user.name : "Unknown",
      createdById: user ? user.id : null,
      expiresAt: expires.toISOString().slice(0, 10),
      status: "Active"
    };
    d.patients.unshift(patient);
    logActivity(user, "Issued patient card", `${patient.name} — ${cardNo} (${money(patient.cardFee)})`);
    save();
    return patient;
  }

  function createPrescription(input, user) {
    const d = load();
    const patient = patientById(input.patientId);
    const rx = {
      id: uid("rx"),
      patientId: input.patientId,
      doctorId: user ? user.id : null,
      doctorName: user ? user.name : "Unknown",
      at: nowISO(),
      status: "pending",
      diagnosis: input.diagnosis || "",
      items: input.items.map(i => ({ drugId: i.drugId, qty: Number(i.qty) || 0, instruction: i.instruction || "" }))
    };
    d.prescriptions.unshift(rx);
    logActivity(user, "Wrote prescription", `${patient ? patient.name : "Patient"} — ${rx.diagnosis || rx.items.length + " item(s)"}`);
    save();
    return rx;
  }

  /**
   * Dispense a whole prescription: checks stock for every line first, then
   * writes one OUT movement per line, bills them to the patient and closes
   * the prescription. Returns {ok, blocked:[...]}.
   */
  function dispensePrescription(rxId, user) {
    const d = load();
    const rx = d.prescriptions.find(r => r.id === rxId);
    if (!rx) return { ok: false, blocked: [{ reason: "Prescription not found" }] };
    if (rx.status !== "pending") return { ok: false, blocked: [{ reason: "Already " + rx.status }] };

    const patient = patientById(rx.patientId);
    const blocked = [];
    rx.items.forEach(item => {
      const drug = drugById(item.drugId);
      if (!drug) { blocked.push({ reason: "Drug no longer in the catalogue" }); return; }
      const st = drugStatus(drug);
      if (st.key === "expired") blocked.push({ drug: drug.name, reason: `expired on ${fmtDate(drug.expiry)}` });
      else if (st.stock < item.qty) blocked.push({ drug: drug.name, reason: `only ${st.stock} in stock, ${item.qty} needed` });
    });
    if (blocked.length) return { ok: false, blocked };

    const now = nowISO();
    let total = 0;
    rx.items.forEach(item => {
      const drug = drugById(item.drugId);
      total += item.qty * drug.unitPrice;
      d.movements.unshift({
        id: uid("m"), drugId: drug.id, type: "OUT", qty: item.qty, unitPrice: drug.unitPrice,
        date: todayISO(), at: now, staffId: user ? user.id : null,
        staffName: user ? user.name : "Unknown",
        patientId: rx.patientId, patientName: patient ? patient.name : "",
        prescriptionId: rx.id, note: item.instruction
      });
    });
    rx.status = "dispensed";
    rx.dispensedAt = now;
    rx.dispensedBy = user ? user.name : "Unknown";
    rx.total = total;
    logActivity(user, "Dispensed prescription", `${patient ? patient.name : "Patient"} (${patient ? patient.cardNo : "—"}) — ${rx.items.length} item(s), ${money(total)}`);
    save();
    return { ok: true, total, rx };
  }

  /** Counter sale — dispense straight to a patient card without a prescription. */
  function dispenseDirect(input, user) {
    const d = load();
    const drug = drugById(input.drugId);
    const patient = patientById(input.patientId);
    if (!drug || !patient) return { ok: false, blocked: [{ reason: "Select a patient and a drug" }] };
    const st = drugStatus(drug);
    const qty = Number(input.qty) || 0;
    if (qty <= 0) return { ok: false, blocked: [{ reason: "Quantity must be at least 1" }] };
    if (st.key === "expired") return { ok: false, blocked: [{ drug: drug.name, reason: `expired on ${fmtDate(drug.expiry)}` }] };
    if (st.stock < qty) return { ok: false, blocked: [{ drug: drug.name, reason: `only ${st.stock} in stock` }] };

    d.movements.unshift({
      id: uid("m"), drugId: drug.id, type: "OUT", qty, unitPrice: drug.unitPrice,
      date: todayISO(), at: nowISO(), staffId: user ? user.id : null,
      staffName: user ? user.name : "Unknown",
      patientId: patient.id, patientName: patient.name, note: input.note || "Counter sale"
    });
    logActivity(user, "Dispensed at counter", `${patient.name} — ${drug.name} ${drug.dosage} ×${qty} (${money(qty * drug.unitPrice)})`);
    save();
    return { ok: true, total: qty * drug.unitPrice };
  }

  function receiveStock(input, user) {
    const d = load();
    const drug = drugById(input.drugId);
    const qty = Number(input.qty) || 0;
    if (!drug || qty <= 0) return { ok: false };
    d.movements.unshift({
      id: uid("m"), drugId: drug.id, type: "IN", qty, unitPrice: drug.unitPrice,
      date: input.date || todayISO(), at: nowISO(), staffId: user ? user.id : null,
      staffName: user ? user.name : "Unknown", note: input.note || "Stock received"
    });
    if (input.expiry) drug.expiry = input.expiry;
    if (input.batch) drug.batch = input.batch;
    logActivity(user, "Received stock", `${drug.name} ${drug.dosage} ×${qty}`);
    save();
    return { ok: true };
  }

  function addDrug(input, user) {
    const d = load();
    const drug = {
      id: uid("d"),
      name: input.name,
      dosage: input.dosage,
      form: input.form || "Tablet",
      unitPrice: Number(input.unitPrice) || 0,
      openingStock: Number(input.openingStock) || 0,
      reorderLevel: Number(input.reorderLevel) || 0,
      expiry: input.expiry || "",
      batch: input.batch || ""
    };
    d.drugs.push(drug);
    logActivity(user, "Added drug to catalogue", `${drug.name} ${drug.dosage} — ${money(drug.unitPrice)}/unit`);
    save();
    return drug;
  }

  function recordVitals(input, user) {
    const d = load();
    const patient = patientById(input.patientId);
    const v = {
      id: uid("v"), patientId: input.patientId, bp: input.bp || "", temp: Number(input.temp) || 0,
      pulse: Number(input.pulse) || 0, weight: Number(input.weight) || 0,
      takenBy: user ? user.name : "Unknown", at: nowISO(), note: input.note || ""
    };
    d.vitals.unshift(v);
    logActivity(user, "Recorded vitals", `${patient ? patient.name : "Patient"} — BP ${v.bp}, ${v.temp}°C`);
    save();
    return v;
  }

  function csvOf(rows) {
    return rows.map(r => r.map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  return {
    STORAGE_KEY, SESSION_KEY, ROLES,
    uid, todayISO, nowISO, daysBetween, money, moneyShort, fmtDate, fmtDateTime, initials, esc, csvOf,
    data, load, save, reset, seed,
    login, logout, currentUser, can,
    stockOf, drugStatus, patientById, drugById, userById,
    dispensesFor, patientSpend, prescriptionsFor, vitalsFor, pendingPrescriptions,
    alerts, suggestedOrder, revenueByDay, totals,
    createPatient, createPrescription, dispensePrescription, dispenseDirect,
    receiveStock, addDrug, recordVitals, logActivity
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = LL;

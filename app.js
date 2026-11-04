/* GYM ONE Trenčín – aplikácia (PWA) */
import { PRODUCTS, productById, buildPass, codeFrom, isoDate, parseISO, addDays } from "./shared/products.js";
import { renderConfirmationEmail } from "./shared/email.js";

(() => {
  "use strict";
  const CFG = Object.assign({ appUrl: location.href.split(/[?#]/)[0], apiUrl: "", emailjs: {} }, window.GYMONE_CONFIG || {});
  const API = (CFG.apiUrl || "").replace(/\/$/, "");
  const LIVE = !!API;

  // ---------------------------------------------------------------- Dáta
  const GYM = {
    lat: 48.894554,
    lng: 18.062685,
    tz: "Europe/Bratislava",
    // 0 = nedeľa … 6 = sobota; časy v minútach od polnoci
    hours: {
      weekday: { open: 5 * 60 + 30, close: 22 * 60 },
      weekend: { open: 7 * 60, close: 22 * 60 },
      holiday: { open: 7 * 60, close: 22 * 60 },
    },
  };

  const PHOTOS = [
    { f: "gym-281", c: "kardio", t: "Kardio zóna a sprint dráha" },
    { f: "gym-23", c: "sila", t: "Jednoručky a lavice" },
    { f: "gym-9", c: "kardio", t: "Bežecké pásy s výhľadom" },
    { f: "gym-11", c: "funkcna", t: "Funkčná zóna" },
    { f: "gym-13", c: "sila", t: "Stroje gym80" },
    { f: "gym-16", c: "relax", t: "Oddychová zóna" },
    { f: "gym-21", c: "sila", t: "Zeleň v silovej zóne" },
    { f: "gym-7", c: "funkcna", t: "Agility dráha" },
    { f: "gym-4", c: "satne", t: "Šatne" },
    { f: "gym-18", c: "sila", t: "Kladkové veže" },
    { f: "gym-12", c: "funkcna", t: "Stretch a funkčný tréning" },
    { f: "gym-10", c: "sila", t: "Pohľad z galérie" },
    { f: "gym-14", c: "sila", t: "Plate-loaded stroje" },
    { f: "gym-17", c: "relax", t: "Detský kútik" },
    { f: "gym-20", c: "sila", t: "Silová zóna" },
    { f: "gym-6", c: "satne", t: "Šatne – zrkadlo GYM ONE" },
    { f: "gym-22", c: "sila", t: "Kladky a multipress" },
    { f: "gym-15", c: "sila", t: "Detail stroja" },
    { f: "gym-24", c: "sila", t: "Voľné váhy" },
    { f: "gym-8", c: "relax", t: "Schodisko na galériu" },
    { f: "gym-25", c: "sila", t: "Kotúče a stojany" },
    { f: "gym-3", c: "satne", t: "Šatne a skrinky" },
    { f: "gym-27", c: "sila", t: "Izolované stroje" },
  ];
  const PHOTO_CATS = [
    { id: "all", t: "Všetko" },
    { id: "sila", t: "Silová zóna" },
    { id: "kardio", t: "Kardio" },
    { id: "funkcna", t: "Funkčná & agility" },
    { id: "relax", t: "Relax & kútik" },
    { id: "satne", t: "Šatne" },
  ];
  const ZONES = [
    { t: "Silová zóna", f: "gym-23", c: "sila" },
    { t: "Kardio zóna", f: "gym-9", c: "kardio" },
    { t: "Funkčná zóna", f: "gym-11", c: "funkcna" },
    { t: "Agility zóna", f: "gym-7", c: "funkcna" },
    { t: "Oddychové zóny", f: "gym-16", c: "relax" },
    { t: "Detský kútik", f: "gym-17", c: "relax" },
  ];

  // ---------------------------------------------------------------- Pomocné
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eur = (n) => (Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")) + " €";
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtTime = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}. ${+m}. ${y}`; };

  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* súkromný režim */ } },
  };

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("is-show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("is-show"), 2600);
  }

  // ---------------------------------------------------------------- Čas v Trenčíne
  function nowInTrencin() {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { timeZone: GYM.tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" })
        .formatToParts(new Date()).map((x) => [x.type, x.value])
    );
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
    return { iso: `${p.year}-${p.month}-${p.day}`, wd, minutes: (+p.hour % 24) * 60 + +p.minute };
  }

  function easterSunday(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return isoDate(new Date(y, month - 1, day));
  }
  function isHoliday(iso) {
    const y = +iso.slice(0, 4), md = iso.slice(5);
    const fixed = ["01-01", "01-06", "05-01", "05-08", "07-05", "08-29", "09-15", "11-01", "11-17", "12-24", "12-25", "12-26"];
    const e = easterSunday(y);
    return fixed.includes(md) || iso === addDays(e, -2) || iso === addDays(e, 1);
  }
  function hoursFor(iso, wd) {
    if (isHoliday(iso)) return { ...GYM.hours.holiday, holiday: true };
    return wd === 0 || wd === 6 ? GYM.hours.weekend : GYM.hours.weekday;
  }

  function openState() {
    const n = nowInTrencin();
    const h = hoursFor(n.iso, n.wd);
    const open = n.minutes >= h.open && n.minutes < h.close;
    let label;
    if (open) {
      const left = h.close - n.minutes;
      label = left <= 60 ? `Otvorené · zatvára o ${fmtTime(h.close)} (o ${left} min)` : `Otvorené · do ${fmtTime(h.close)}`;
    } else if (n.minutes < h.open) {
      label = `Zatvorené · otvára o ${fmtTime(h.open)}`;
    } else {
      const tIso = addDays(n.iso, 1), tWd = (n.wd + 1) % 7;
      label = `Zatvorené · zajtra od ${fmtTime(hoursFor(tIso, tWd).open)}`;
    }
    return { open, label, today: h, n };
  }

  function renderOpenState() {
    const s = openState();
    const cls = s.open ? "is-open" : "is-closed";
    const top = $("#topStatus");
    top.classList.remove("is-open", "is-closed"); top.classList.add(cls);
    $(".label", top).textContent = s.open ? "Otvorené" : "Zatvorené";
    $("#todayHours").textContent = `${fmtTime(s.today.open)} – ${fmtTime(s.today.close)}${s.today.holiday ? " · sviatok" : ""}`;
    const ts = $("#todayState"); ts.className = "today-card__state " + cls; ts.textContent = s.label.split(" · ")[1] ? s.label.split(" · ")[1] : s.label;
    const pill = $("#openPill"); pill.className = "pill " + cls; pill.textContent = s.open ? "Teraz otvorené" : "Teraz zatvorené";

    const days = [["Pondelok", 1], ["Utorok", 2], ["Streda", 3], ["Štvrtok", 4], ["Piatok", 5], ["Sobota", 6], ["Nedeľa", 0]];
    $("#hoursList").innerHTML = days.map(([name, wd]) => {
      const h = wd === 0 || wd === 6 ? GYM.hours.weekend : GYM.hours.weekday;
      return `<li class="${wd === s.n.wd ? "is-today" : ""}"><span>${name}</span><span>${fmtTime(h.open)} – ${fmtTime(h.close)}</span></li>`;
    }).join("");
  }

  // ---------------------------------------------------------------- Navigácia
  const SCREENS = ["home", "shop", "pass", "gallery", "info"];
  function show(name, scrollTo) {
    if (!SCREENS.includes(name)) name = "home";
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.dataset.screen === name));
    $$(".tabbar button").forEach((b) => b.classList.toggle("is-active", b.dataset.go === name));
    if (location.hash.slice(1) !== name) history.pushState(null, "", "#" + name);
    if (name === "info") initMap();
    if (name === "pass") renderPasses();
    if (scrollTo) setTimeout(() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    else window.scrollTo({ top: 0 });
  }
  window.addEventListener("popstate", () => {
    closeCheckout(); closeLightbox();
    const name = location.hash.slice(1) || "home";
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.dataset.screen === name));
    $$(".tabbar button").forEach((b) => b.classList.toggle("is-active", b.dataset.go === name));
    if (name === "info") initMap();
    if (name === "pass") renderPasses();
  });

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); show(go.dataset.go, go.dataset.scroll); return; }
    const buy = e.target.closest("[data-buy]");
    if (buy) { openCheckout(buy.dataset.buy); return; }
  });

  // ---------------------------------------------------------------- Domov – zóny
  function renderZones() {
    $("#zones").innerHTML = ZONES.map((z) =>
      `<button class="zone" data-zone="${z.c}"><img src="img/thumb/${z.f}.webp" alt="${esc(z.t)}" loading="lazy"><span>${esc(z.t)}</span></button>`
    ).join("");
    $("#zones").addEventListener("click", (e) => {
      const z = e.target.closest("[data-zone]"); if (!z) return;
      setGalleryFilter(z.dataset.zone); show("gallery");
    });
  }

  // ---------------------------------------------------------------- Obchod
  let currentCat = "perm";
  function renderProducts() {
    $("#products").innerHTML = PRODUCTS.filter((p) => p.cat === currentCat).map((p) => `
      <article class="product ${p.badge ? "is-featured" : ""}">
        ${p.badge ? `<span class="product__badge">${p.badge}</span>` : ""}
        <h3>${p.title}</h3>
        <div class="product__price">${eur(p.price)}${p.per ? `<small>${p.per}</small>` : ""}</div>
        <p class="product__desc">${p.desc}</p>
        <button class="btn ${p.badge ? "btn--primary" : "btn--dark"}" data-buy="${p.id}">Kúpiť</button>
      </article>`).join("");
  }
  $$(".segmented button").forEach((b) => b.addEventListener("click", () => {
    currentCat = b.dataset.cat;
    $$(".segmented button").forEach((x) => x.classList.toggle("is-active", x === b));
    renderProducts();
  }));

  // ---------------------------------------------------------------- Checkout
  const sheet = $("#checkout");
  const form = $("#coForm");
  let selected = null;

  function openCheckout(id) {
    const p = productById(id);
    if (!p) return;
    if (p.id === "free" && getPasses().some((x) => x.productId === "free")) {
      toast("Uvítací vstup zadarmo si už využil/a 🙂"); show("pass"); return;
    }
    selected = p;
    $("#coTitle").textContent = p.title;
    $("#coSub").textContent = p.desc;
    $("#coPrice").textContent = eur(p.price);
    // V ostrom režime kartu zadáva zákazník priamo na zabezpečenej stránke Stripe
    $("#payFields").hidden = p.price === 0 || LIVE;
    $("#liveNote").hidden = !(LIVE && p.price > 0);
    $("#demoNote").hidden = LIVE || p.price === 0;
    $("#coSubmit").textContent = p.price === 0 ? "Získať vstup" : LIVE ? `Pokračovať na platbu ${eur(p.price)}` : `Zaplatiť ${eur(p.price)}`;
    const profile = store.get("g1_profile", {});
    form.name.value = profile.name || ""; form.email.value = profile.email || ""; form.phone.value = profile.phone || "";
    const today = nowInTrencin().iso;
    form.start.value = today; form.start.min = today;
    $("#startWrap").firstChild.textContent = p.entries === 1 && p.days === 1 ? "Deň vstupu" : "Začiatok platnosti";
    $("#coError").textContent = "";
    $$("input", form).forEach((i) => i.classList.remove("invalid"));
    sheet.classList.add("is-open"); sheet.setAttribute("aria-hidden", "false");
  }
  function closeCheckout() { sheet.classList.remove("is-open"); sheet.setAttribute("aria-hidden", "true"); }
  sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeCheckout(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeCheckout(); closeLightbox(); closeMail(); } });

  form.addEventListener("change", () => { $("#cardFields").hidden = form.pm.value !== "card"; });
  form.card.addEventListener("input", () => { form.card.value = form.card.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); });
  form.exp.addEventListener("input", () => { const v = form.exp.value.replace(/\D/g, "").slice(0, 4); form.exp.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v; });
  form.cvc.addEventListener("input", () => { form.cvc.value = form.cvc.value.replace(/\D/g, "").slice(0, 4); });

  const luhn = (num) => { let s = 0, alt = false; for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };

  function validate() {
    const errs = [];
    const mark = (el, bad, msg) => { el.classList.toggle("invalid", bad); if (bad) errs.push(msg); };
    mark(form.name, form.name.value.trim().length < 3, "Zadaj meno a priezvisko.");
    mark(form.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()), "Zadaj platný e-mail.");
    mark(form.start, !form.start.value || form.start.value < nowInTrencin().iso, "Vyber dátum (dnes alebo neskôr).");
    if (!LIVE && selected.price > 0 && form.pm.value === "card") {
      const num = form.card.value.replace(/\s/g, "");
      mark(form.card, num.length < 13 || !luhn(num), "Neplatné číslo karty.");
      const [mm, yy] = form.exp.value.split("/").map(Number);
      const n = new Date(); const expOk = mm >= 1 && mm <= 12 && yy >= 0 && new Date(2000 + yy, mm, 1) > n;
      mark(form.exp, !expOk, "Neplatná platnosť karty.");
      mark(form.cvc, form.cvc.value.length < 3, "Zadaj CVC.");
    }
    if (!form.terms.checked) errs.push("Potvrď súhlas s prevádzkovým poriadkom.");
    $("#coError").textContent = errs[0] || "";
    return errs.length === 0;
  }

  async function api(path, opts = {}) {
    const r = await fetch(API + path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Spojenie so serverom zlyhalo.");
    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const btn = $("#coSubmit"); const label = btn.textContent;
    const busy = (t) => { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>${t}`; };
    const idle = () => { btn.disabled = false; btn.textContent = label; };
    const customer = { name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(), start: form.start.value };
    store.set("g1_profile", { name: customer.name, email: customer.email, phone: customer.phone });

    try {
      if (LIVE && selected.price > 0) {
        // Ostrý režim → presmerovanie na zabezpečenú platobnú bránu Stripe
        busy("Presmerúvam na platobnú bránu…");
        const { url } = await api("/api/checkout", { method: "POST", body: JSON.stringify({ productId: selected.id, ...customer }) });
        location.href = url;
        return;
      }
      if (LIVE) {
        busy("Pripravujem…");
        const { pass } = await api("/api/free", { method: "POST", body: JSON.stringify(customer) });
        finishPurchase(pass, { emailed: true });
      } else {
        // DEMO režim – simulácia platobnej brány
        busy(selected.price ? "Spracúvam platbu…" : "Pripravujem…");
        await new Promise((r) => setTimeout(r, 1400));
        const pass = buildPass({
          product: selected, start: customer.start, owner: customer.name, email: customer.email,
          code: codeFrom(`${customer.email}:${Date.now()}:${Math.random()}`),
          method: selected.price ? form.pm.value : "free",
        });
        const emailed = await sendEmailFromBrowser(pass);
        finishPurchase(pass, { emailed, demo: true });
      }
    } catch (err) {
      $("#coError").textContent = err.message;
    } finally {
      idle();
    }
  });

  function finishPurchase(pass, { emailed, demo } = {}) {
    savePass(pass);
    form.reset(); closeCheckout();
    show("pass");
    const where = pass.email ? ` na ${pass.email}` : "";
    toast(emailed ? `Hotovo ✓ Potvrdenie sme poslali${where}` : pass.price ? "Platba prebehla úspešne ✓" : "Vstup zadarmo je tvoj ✓");
    // V demo režime bez odoslania ukážeme, ako e-mail vyzerá
    if (demo && !emailed) setTimeout(() => openMail(pass.id, true), 900);
  }

  // Návrat zo Stripe (?paid=cs_…)
  async function handleStripeReturn() {
    const qs = new URLSearchParams(location.search);
    const clean = () => history.replaceState(null, "", location.pathname + location.hash);
    if (qs.has("canceled")) { clean(); toast("Platba bola zrušená – nič sa nestrhlo"); return; }
    const sid = qs.get("paid");
    if (!sid || !LIVE) return;
    clean();
    show("pass");
    toast("Overujem platbu…");
    try {
      const res = await api(`/api/verify?session_id=${encodeURIComponent(sid)}`);
      if (!res.paid) { toast("Platba zatiaľ nebola potvrdená"); return; }
      const isNew = !getPasses().some((x) => x.id === res.pass.id);
      if (isNew) savePass(res.pass);
      renderPasses();
      toast(`Platba prijatá ✓ Potvrdenie sme poslali na ${res.pass.email}`);
    } catch (err) { toast(err.message); }
  }

  // EmailJS priamo z prehliadača (voliteľné, len keď nie je server)
  async function sendEmailFromBrowser(pass) {
    const ej = CFG.emailjs || {};
    if (!ej.publicKey || !ej.serviceId || !ej.templateId || !pass.email) return false;
    const mail = renderConfirmationEmail({ pass, appUrl: CFG.appUrl, test: pass.price > 0 });
    try {
      const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: ej.serviceId, template_id: ej.templateId, user_id: ej.publicKey,
          template_params: { to_email: pass.email, to_name: pass.owner, reply_to: "info@gymone.sk", subject: mail.subject, html: mail.html, text: mail.text },
        }),
      });
      return r.ok;
    } catch { return false; }
  }

  // ---------------------------------------------------------------- Náhľad e-mailu
  const mailModal = $("#mailModal");
  function openMail(passId, justBought) {
    const pass = getPasses().find((x) => x.id === passId); if (!pass) return;
    const mail = renderConfirmationEmail({ pass, appUrl: CFG.appUrl, test: !LIVE && pass.price > 0 });
    $("#mailSubject").textContent = mail.subject;
    $("#mailTo").textContent = pass.email || "—";
    $("#mailNote").textContent = justBought
      ? "Takto vyzerá potvrdzovací e-mail. V demo režime sa neodoslal – po zapojení servera príde zákazníkovi automaticky."
      : "Kópia potvrdzovacieho e-mailu k tejto objednávke.";
    $("#mailFrame").srcdoc = mail.html;
    mailModal.classList.add("is-open"); mailModal.setAttribute("aria-hidden", "false");
  }
  function closeMail() { mailModal.classList.remove("is-open"); mailModal.setAttribute("aria-hidden", "true"); }
  mailModal.addEventListener("click", (e) => { if (e.target.closest("[data-mail-close]")) closeMail(); });

  // ---------------------------------------------------------------- Karty / permanentky
  const getPasses = () => store.get("g1_passes", []);
  const savePasses = (p) => store.set("g1_passes", p);
  const savePass = (pass) => { const all = getPasses().filter((x) => x.id !== pass.id); all.unshift(pass); savePasses(all); };

  function passStatus(p) {
    const today = nowInTrencin().iso;
    if (p.type === "entries" && p.entriesLeft <= 0) return { ok: false, t: "Vyčerpaná" };
    if (today > p.end) return { ok: false, t: "Expirovaná" };
    if (today < p.start) return { ok: true, t: "Od " + fmtDate(p.start) };
    return { ok: true, t: "Aktívna" };
  }

  function renderPasses() {
    const passes = getPasses();
    const wrap = $("#passList");
    if (!passes.length) {
      wrap.innerHTML = `
        <div class="empty">
          <img src="img/thumb/gym-6.webp" alt="">
          <h2>Zatiaľ nemáš permanentku</h2>
          <p>Kúp si členstvo alebo vstupy a tvoj QR kód na vstup sa zobrazí tu.</p>
          <button class="btn btn--primary" data-go="shop">Vybrať členstvo</button>
          <p style="margin-top:14px"><button class="link" data-buy="free">alebo získaj prvý vstup zadarmo →</button></p>
        </div>`;
      return;
    }
    const sorted = [...passes].sort((a, b) => passStatus(b).ok - passStatus(a).ok);
    wrap.innerHTML = sorted.map((p) => {
      const st = passStatus(p);
      const remaining = Math.max(0, Math.round((parseISO(p.end) - parseISO(nowInTrencin().iso)) / 864e5) + 1);
      const third = p.type === "entries"
        ? `<div><p class="k">Vstupy</p><p class="v">${p.entriesLeft} / ${p.entriesTotal}</p></div>`
        : `<div><p class="k">Zostáva</p><p class="v">${st.ok ? remaining + " dní" : "—"}</p></div>`;
      const pct = p.type === "entries" ? (p.entriesLeft / p.entriesTotal) * 100
        : Math.max(0, Math.min(100, (remaining / (Math.round((parseISO(p.end) - parseISO(p.start)) / 864e5) + 1)) * 100));
      return `
      <article class="pass" data-pass="${p.id}">
        <div class="pass__top"><img class="pass__logo" src="img/logo-white.svg" alt="GYM ONE"><span class="pass__status ${st.ok ? "" : "is-expired"}">${st.t}</span></div>
        <div class="pass__name"><h2>${esc(p.title)}</h2><p>${esc(p.owner)}${p.multisport ? " · ukáž kartu MultiSport" : ""}</p></div>
        <div class="pass__qr"><div class="qr" data-qr="${p.code}"></div><div class="pass__code">${p.code}</div></div>
        <div class="pass__meta">
          <div><p class="k">Od</p><p class="v">${fmtDate(p.start)}</p></div>
          <div><p class="k">Do</p><p class="v">${fmtDate(p.end)}</p></div>
          ${third}
        </div>
        <div class="progress"><span style="width:${st.ok ? pct : 0}%"></span></div>
        <div class="pass__actions">
          ${st.ok && !LIVE ? `<button class="btn btn--primary" data-checkin="${p.id}">Check-in (demo)</button>` : ""}
          <button class="btn btn--outline" data-mail="${p.id}">✉ Potvrdzovací e-mail</button>
        </div>
      </article>`;
    }).join("") + historyHtml(passes) +
      `<p class="muted small center" style="margin-top:14px">Na recepcii naskenuj QR kód. Údaje sú uložené len v tomto zariadení.</p>`;

    $$("[data-qr]", wrap).forEach((el) => {
      if (window.QRCode) new QRCode(el, { text: "GYMONE:" + el.dataset.qr, width: 380, height: 380, colorDark: "#331F12", colorLight: "#F4EFE6", correctLevel: QRCode.CorrectLevel.M });
      else el.innerHTML = `<p class="muted small center">QR kód sa načíta po pripojení k internetu.</p>`;
    });
  }

  function historyHtml(passes) {
    const items = passes.flatMap((p) => p.log.map((t) => ({ t, title: p.title }))).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 8);
    const buys = passes.slice(0, 5).map((p) => `<li><span>${esc(p.title)}</span><span>${eur(p.price)}</span></li>`).join("");
    return `<div class="card history">
      <h3>Posledné vstupy</h3>
      <ul>${items.length ? items.map((i) => { const d = new Date(i.t); return `<li><span>${esc(i.title)}</span><span>${d.toLocaleDateString("sk-SK")} ${d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}</span></li>`; }).join("") : `<li><span class="muted">Zatiaľ žiadne</span><span></span></li>`}</ul>
      <h3 style="margin-top:16px">Nákupy</h3><ul>${buys}</ul>
    </div>`;
  }

  $("#passList").addEventListener("click", (e) => {
    const ci = e.target.closest("[data-checkin]");
    if (ci) {
      const all = getPasses(); const p = all.find((x) => x.id === ci.dataset.checkin); if (!p) return;
      const s = openState();
      if (!s.open) { toast("Fitko je teraz zatvorené"); return; }
      if (nowInTrencin().iso < p.start) { toast("Permanentka ešte nezačala platiť"); return; }
      if (p.type === "entries") p.entriesLeft -= 1;
      p.log.push(new Date().toISOString()); savePasses(all);
      toast(p.type === "entries" ? `Vstup zaznamenaný · zostáva ${p.entriesLeft}` : "Vitaj v GYM ONE! 💪");
      renderPasses();
    }
    const m = e.target.closest("[data-mail]");
    if (m) openMail(m.dataset.mail);
  });

  // ---------------------------------------------------------------- Galéria
  let galleryCat = "all";
  let lbIndex = 0;
  const visiblePhotos = () => PHOTOS.filter((p) => galleryCat === "all" || p.c === galleryCat);

  function setGalleryFilter(c) {
    galleryCat = c;
    $$("#galleryFilter button").forEach((b) => b.classList.toggle("is-active", b.dataset.c === c));
    $("#gallery").innerHTML = visiblePhotos().map((p, i) =>
      `<button data-i="${i}" aria-label="${esc(p.t)}"><img src="img/thumb/${p.f}.webp" alt="${esc(p.t)}" loading="lazy"></button>`).join("");
  }
  function renderGallery() {
    $("#galleryFilter").innerHTML = PHOTO_CATS.map((c) => `<button data-c="${c.id}">${c.t}</button>`).join("");
    $("#galleryFilter").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (b) setGalleryFilter(b.dataset.c); });
    $("#gallery").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) openLightbox(+b.dataset.i); });
    setGalleryFilter("all");
  }

  const lb = $("#lightbox");
  function openLightbox(i) { lbIndex = i; updateLightbox(); lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); }
  function closeLightbox() { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); }
  function updateLightbox() {
    const list = visiblePhotos(); lbIndex = (lbIndex + list.length) % list.length;
    const p = list[lbIndex];
    $("#lbImg").src = `img/${p.f}.webp`; $("#lbImg").alt = p.t;
    $("#lbCap").textContent = `${p.t} · ${lbIndex + 1} / ${list.length}`;
  }
  lb.addEventListener("click", (e) => {
    const a = e.target.closest("[data-lb]")?.dataset.lb;
    if (a === "close" || e.target === lb) closeLightbox();
    if (a === "prev") { lbIndex--; updateLightbox(); }
    if (a === "next") { lbIndex++; updateLightbox(); }
  });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "ArrowLeft") { lbIndex--; updateLightbox(); }
    if (e.key === "ArrowRight") { lbIndex++; updateLightbox(); }
  });
  let tx = null;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) { lbIndex += dx < 0 ? 1 : -1; updateLightbox(); }
  });

  // ---------------------------------------------------------------- Mapa
  let map;
  function initMap() {
    if (map) { setTimeout(() => map.invalidateSize(), 50); return; }
    if (!window.L) { $("#map").innerHTML = `<p class="muted small center" style="padding:110px 16px">Mapa sa načíta po pripojení k internetu.</p>`; return; }
    setTimeout(() => {
      map = L.map("map", { scrollWheelZoom: false, zoomControl: true }).setView([GYM.lat, GYM.lng], 16);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const icon = L.divIcon({ className: "gym-pin", html: '<div><img src="img/icon-192.png" alt=""></div>', iconSize: [46, 46], iconAnchor: [23, 50], popupAnchor: [0, -46] });
      L.marker([GYM.lat, GYM.lng], { icon }).addTo(map)
        .bindPopup("<b>GYM ONE</b><br>Gen. M. R. Štefánika 6833<br>Trenčín").openPopup();
    }, 60);
  }

  // ---------------------------------------------------------------- Štart
  renderZones();
  renderProducts();
  renderGallery();
  renderOpenState();
  setInterval(renderOpenState, 30000);
  show(location.hash.slice(1) || "home");
  handleStripeReturn();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();

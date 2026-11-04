// GYM ONE – platobný server (jeden súbor na vloženie do Cloudflare → Workers → Edit code).
// Vygenerované zo server/worker.js + shared/*.js – neupravuj ručne.
// ../shared/products.js
var PRODUCTS = [
  // Permanentky
  { id: "m1", cat: "perm", title: "Permanentka 1 mesiac", price: 59, months: 1, desc: "Neobmedzen\xFD vstup po\u010Das 30 dn\xED do v\u0161etk\xFDch z\xF3n." },
  { id: "m1s", cat: "perm", title: "\u0160tudent \u2013 1 mesiac", price: 50, months: 1, desc: "Pre \u0161tudentov s platn\xFDm ISIC. Neobmedzen\xFD vstup." },
  { id: "m1x", cat: "perm", title: "Senior \u2013 1 mesiac", price: 50, months: 1, desc: "Pre seniorov nad 65 rokov. Neobmedzen\xFD vstup." },
  { id: "m3", cat: "perm", title: "3 mesiace", price: 165, months: 3, desc: "Neobmedzen\xFD vstup na 3 mesiace.", per: "55 \u20AC / mesiac", badge: "Ob\u013E\xFAben\xE9" },
  { id: "m12", cat: "perm", title: "12 mesiacov", price: 600, months: 12, desc: "Cel\xFD rok tr\xE9ningu bez obmedzen\xED.", per: "50 \u20AC / mesiac", badge: "Najv\xFDhodnej\u0161ie" },
  // Vstupy
  { id: "e10", cat: "entries", title: "10 vstupov", price: 65, entries: 10, days: 90, desc: "Platnos\u0165 90 dn\xED od za\u010Diatku.", per: "6,50 \u20AC / vstup" },
  { id: "e20", cat: "entries", title: "20 vstupov", price: 120, entries: 20, days: 90, desc: "Platnos\u0165 90 dn\xED od za\u010Diatku.", per: "6 \u20AC / vstup", badge: "V\xFDhodn\xE9" },
  // Extras
  { id: "s1", cat: "extras", title: "Jednorazov\xFD vstup", price: 7, entries: 1, days: 1, desc: "Jeden vstup na zvolen\xFD de\u0148." },
  { id: "s1s", cat: "extras", title: "\u0160tudentsk\xFD vstup", price: 5, entries: 1, days: 1, desc: "Jeden vstup so \u0161tudentsk\xFDm preukazom." },
  { id: "s1x", cat: "extras", title: "Seniorsk\xFD vstup", price: 4, entries: 1, days: 1, desc: "Jeden vstup pre seniorov nad 65 rokov." },
  { id: "ms", cat: "extras", title: "MultiSport / UpBalansea", price: 5, months: 12, multisport: true, desc: "Vstup s kartou za 0 \u20AC po jednorazovom poplatku 5 \u20AC. Kartu uk\xE1\u017E na recepcii." },
  // Skrytý – promo
  { id: "free", cat: "hidden", title: "Prv\xFD vstup zadarmo", price: 0, entries: 1, days: 30, desc: "Uv\xEDtac\xED vstup pre nov\xFDch \u010Dlenov (plat\xED 30 dn\xED)." }
];
var productById = (id) => PRODUCTS.find((p) => p.id === id);
var pad2 = (n) => String(n).padStart(2, "0");
var isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
var parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
var addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
var addMonths = (iso, n) => {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  d.setDate(d.getDate() - 1);
  return isoDate(d);
};
var endDate = (product, start) => product.months ? addMonths(start, product.months) : addDays(start, (product.days || 1) - 1);
function codeFrom(id) {
  let h1 = 2166136261, h2 = 16777619;
  for (let i = 0; i < id.length; i++) {
    h1 = Math.imul(h1 ^ id.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + id.charCodeAt(i), 2246822519) >>> 0;
  }
  const s = (h1.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(8, "X");
  return `G1-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}
function buildPass({ product, start, owner, email, code, method, orderId, purchasedAt }) {
  return {
    id: code,
    code,
    orderId: orderId || code,
    productId: product.id,
    title: product.title,
    price: product.price,
    pm: method || "card",
    type: product.entries ? "entries" : "time",
    multisport: !!product.multisport,
    start,
    end: endDate(product, start),
    entriesTotal: product.entries || null,
    entriesLeft: product.entries || null,
    owner,
    email,
    purchasedAt: purchasedAt || (/* @__PURE__ */ new Date()).toISOString(),
    log: []
  };
}

// ../shared/email.js
var C = { olive: "#737A59", brown: "#331F12", wood: "#A57B5B", cream: "#F4EFE6", line: "#E6DDCF", muted: "#7A6C5F", text: "#2A1B10" };
var GYM = {
  name: "GYM ONE",
  street: "Gen. M. R. \u0160tef\xE1nika 6833",
  city: "911 01 Tren\u010D\xEDn",
  phone: "+421 911 296 014",
  email: "info@gymone.sk",
  web: "https://www.gymone.sk",
  instagram: "https://www.instagram.com/gymone91101/",
  nav: "https://www.google.com/maps/dir/?api=1&destination=48.894554,18.062685"
};
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var fmtDate = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${+d}. ${+m}. ${y}`;
};
var eur = (n) => (Number.isInteger(n) ? `${n},00` : n.toFixed(2).replace(".", ",")) + " \u20AC";
var METHODS = { card: "Platobn\xE1 karta", apple: "Apple Pay", google: "Google Pay", link: "Stripe Link", free: "Zadarmo", demo: "Demo platba" };
function renderConfirmationEmail({ pass, appUrl: appUrl2, test = false }) {
  const base = appUrl2.endsWith("/") ? appUrl2 : appUrl2 + "/";
  const firstName = (pass.owner || "").trim().split(/\s+/)[0] || "\u0161portovec";
  const isFree = pass.price === 0;
  const isSingle = pass.entriesTotal === 1;
  const subject = isFree ? `Tvoj vstup zadarmo do GYM ONE je pripraven\xFD \xB7 ${pass.code}` : `Potvrdenie objedn\xE1vky: ${pass.title} \xB7 ${pass.code}`;
  const preheader = isFree ? "Uk\xE1\u017E QR k\xF3d na recepcii a prv\xFD tr\xE9ning m\xE1\u0161 na n\xE1s." : `Platba ${eur(pass.price)} prebehla \xFAspe\u0161ne. Tvoj QR k\xF3d na vstup je v e-maile.`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=0&ecc=M&color=331F12&bgcolor=FFFFFF&data=${encodeURIComponent("GYMONE:" + pass.code)}`;
  const purchased = new Date(pass.purchasedAt);
  const purchasedStr = new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(purchased);
  const validity = isSingle && pass.start === pass.end ? fmtDate(pass.start) : `${fmtDate(pass.start)} \u2013 ${fmtDate(pass.end)}`;
  const rows = [
    ["Produkt", esc(pass.title)],
    [isSingle && pass.start === pass.end ? "De\u0148 vstupu" : "Platnos\u0165", validity],
    pass.entriesTotal ? ["Po\u010Det vstupov", String(pass.entriesTotal)] : ["Typ", "Neobmedzen\xFD vstup"],
    ["Dr\u017Eite\u013E", esc(pass.owner)],
    ["\u010C\xEDslo objedn\xE1vky", esc(pass.orderId || pass.code)],
    ["D\xE1tum n\xE1kupu", purchasedStr],
    ["Sp\xF4sob platby", METHODS[pass.pm] || "Platobn\xE1 karta"]
  ];
  const row = ([k, v], i) => `
      <tr>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;color:${C.muted};">${k}</td>
        <td align="right" style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;color:${C.text};font-weight:600;">${v}</td>
      </tr>`;
  const step = (n, title, text2) => `
      <tr>
        <td width="44" valign="top" style="padding:0 0 16px;">
          <div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:${C.olive};color:#fff;text-align:center;font-weight:700;font-size:14px;">${n}</div>
        </td>
        <td valign="top" style="padding:4px 0 16px;font-size:14px;line-height:21px;color:${C.text};">
          <strong>${title}</strong><br><span style="color:${C.muted};">${text2}</span>
        </td>
      </tr>`;
  const heading = (t) => `<h2 style="margin:0 0 14px;font-family:'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif;font-weight:400;font-size:26px;line-height:28px;letter-spacing:.5px;color:${C.brown};text-transform:uppercase;">${t}</h2>`;
  const html = `<!doctype html>
<html lang="sk" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Jost:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;width:100%!important;background:${C.cream};}
  table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
  a{color:${C.olive};}
  @media (max-width:620px){
    .container{width:100%!important;}
    .px{padding-left:22px!important;padding-right:22px!important;}
    .h1{font-size:38px!important;line-height:38px!important;}
    .col{display:block!important;width:100%!important;}
    .col-gap{padding-top:12px!important;padding-left:0!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Jost,'Helvetica Neue',Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.cream};">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
<tr><td align="center" style="padding:28px 12px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
    ${test ? `<tr><td style="background:#FFF4D6;color:#7A5B00;font-size:12px;text-align:center;padding:8px 16px;">TESTOVAC\xCD RE\u017DIM \u2013 platba nebola re\xE1lne strhnut\xE1</td></tr>` : ""}
    <!-- Hlavi\u010Dka -->
    <tr>
      <td style="background:${C.brown};padding:26px 36px;" class="px">
        <table role="presentation" width="100%"><tr>
          <td><a href="${base}"><img src="${base}img/email/logo-white.png" width="150" alt="GYM ONE" style="width:150px;height:auto;"></a></td>
          <td align="right" style="font-size:12px;letter-spacing:1.5px;color:#C9B8A4;text-transform:uppercase;">${isFree ? "Uv\xEDtac\xED vstup" : "Potvrdenie objedn\xE1vky"}</td>
        </tr></table>
      </td>
    </tr>
    <!-- Fotka -->
    <tr><td style="background:${C.brown};"><img src="${base}img/email/hero.jpg" width="600" alt="Interi\xE9r GYM ONE Tren\u010D\xEDn" style="width:100%;max-width:600px;height:auto;"></td></tr>

    <!-- Pozdrav -->
    <tr>
      <td class="px" style="padding:36px 36px 8px;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:1.6px;text-transform:uppercase;color:${C.olive};font-weight:600;">${isFree ? "Vitaj v komunite" : "Platba prijat\xE1"}</p>
        <h1 class="h1" style="margin:0 0 16px;font-family:'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif;font-weight:400;font-size:46px;line-height:46px;color:${C.brown};letter-spacing:.5px;">\u010Eakujeme, ${esc(firstName)}!</h1>
        <p style="margin:0;font-size:16px;line-height:25px;color:${C.text};">
          ${isFree ? "Tvoj prv\xFD vstup do GYM ONE je pripraven\xFD. Sta\u010D\xED pr\xEDs\u0165, uk\xE1za\u0165 QR k\xF3d ni\u017E\u0161ie na recepcii a ide\u0161 tr\xE9nova\u0165. O v\u0161etko ostatn\xE9 sa postar\xE1me my." : `Tvoja objedn\xE1vka <strong>${esc(pass.title)}</strong> je zaplaten\xE1 a aktivovan\xE1. Ni\u017E\u0161ie n\xE1jde\u0161 QR k\xF3d, ktor\xFDm sa preuk\xE1\u017Ee\u0161 na recepcii, a v\u0161etky podrobnosti k n\xE1kupu.`}
        </p>
      </td>
    </tr>

    <!-- QR karta -->
    <tr>
      <td class="px" style="padding:28px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.brown};border-radius:16px;">
          <tr>
            <td style="padding:26px;" align="center">
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#C9B8A4;">Tvoja vstupn\xE1 karta</p>
              <p style="margin:0 0 18px;font-family:'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif;font-size:30px;line-height:32px;color:${C.cream};">${esc(pass.title)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;"><tr><td style="padding:16px;">
                <img src="${qr}" width="200" height="200" alt="QR k\xF3d ${esc(pass.code)}" style="width:200px;height:200px;">
              </td></tr></table>
              <p style="margin:14px 0 2px;font-family:'Courier New',Courier,monospace;font-size:18px;letter-spacing:3px;color:${C.cream};font-weight:700;">${esc(pass.code)}</p>
              <p style="margin:0;font-size:13px;color:#C9B8A4;">Plat\xED: ${validity}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- S\xFAhrn -->
    <tr>
      <td class="px" style="padding:0 36px 8px;">
        ${heading("S\xFAhrn objedn\xE1vky")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(row).join("")}
          <tr>
            <td style="padding:16px 0 0;border-top:2px solid ${C.brown};font-size:16px;font-weight:700;color:${C.brown};">Spolu</td>
            <td align="right" style="padding:16px 0 0;border-top:2px solid ${C.brown};font-family:'Bebas Neue',Impact,Arial,sans-serif;font-size:30px;color:${C.olive};">${eur(pass.price)}</td>
          </tr>
          ${isFree ? "" : `<tr><td colspan="2" style="padding:4px 0 0;font-size:12px;color:${C.muted};">Cena vr\xE1tane DPH. Doklad o platbe ti platobn\xE1 br\xE1na posiela samostatn\xFDm e-mailom.</td></tr>`}
        </table>
      </td>
    </tr>

    <!-- Tla\u010Didlo -->
    <tr>
      <td class="px" align="center" style="padding:28px 36px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:999px;background:${C.olive};">
            <a href="${base}#pass" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:.3px;">Otvori\u0165 moju kartu v appke</a>
          </td>
        </tr></table>
      </td>
    </tr>

    <!-- Ako vst\xFApi\u0165 -->
    <tr>
      <td class="px" style="padding:32px 36px 4px;">
        ${heading("Ako vst\xFApi\u0165")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${step(1, "Pr\xED\u010F do GYM ONE", `${GYM.street}, Tren\u010D\xEDn \u2013 parkovanie priamo pri budove.`)}
          ${step(2, "Uk\xE1\u017E QR k\xF3d na recepcii", "Z tohto e-mailu alebo z appky (sekcia Karta). Zv\xFD\u0161 si jas displeja.")}
          ${pass.productId === "m1s" || pass.productId === "s1s" ? step(3, "Maj pri sebe ISIC", "\u0160tudentsk\xFA z\u013Eavu over\xEDme pri prvom vstupe.") : pass.productId === "m1x" || pass.productId === "s1x" ? step(3, "Maj pri sebe ob\u010Diansky preukaz", "Seniorsk\xFA z\u013Eavu (65+) over\xEDme pri prvom vstupe.") : pass.multisport ? step(3, "Uk\xE1\u017E kartu MultiSport / UpBalansea", "Plastov\xFA kartu s dokladom toto\u017Enosti alebo virtu\xE1lnu kartu v mobile.") : step(3, "Uter\xE1k a \u010Dist\xE1 obuv", "Do posil\u0148ovne si prines uter\xE1k a \u010Dist\xFA \u0161portov\xFA obuv. \u0160atne so skrinkami m\xE1\u0161 k dispoz\xEDcii.")}
        </table>
      </td>
    </tr>

    <!-- Hodiny + adresa -->
    <tr>
      <td class="px" style="padding:20px 36px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td class="col" width="50%" valign="top" style="background:${C.cream};border-radius:14px;padding:20px;">
            <p style="margin:0 0 10px;font-family:'Bebas Neue',Impact,Arial,sans-serif;font-size:20px;color:${C.brown};">Otv\xE1racie hodiny</p>
            <p style="margin:0;font-size:14px;line-height:24px;color:${C.text};">Po \u2013 Pi&nbsp;&nbsp;<strong>05:30 \u2013 22:00</strong><br>So \u2013 Ne&nbsp;&nbsp;<strong>07:00 \u2013 22:00</strong><br>Sviatky&nbsp;&nbsp;<strong>07:00 \u2013 22:00</strong></p>
          </td>
          <td class="col col-gap" width="50%" valign="top" style="padding-left:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${C.cream};border-radius:14px;padding:20px;">
              <p style="margin:0 0 10px;font-family:'Bebas Neue',Impact,Arial,sans-serif;font-size:20px;color:${C.brown};">Kde n\xE1s n\xE1jde\u0161</p>
              <p style="margin:0 0 10px;font-size:14px;line-height:22px;color:${C.text};">${GYM.street}<br>${GYM.city}</p>
              <a href="${GYM.nav}" style="font-size:14px;font-weight:600;color:${C.olive};text-decoration:none;">Navigova\u0165 &rarr;</a>
            </td></tr></table>
          </td>
        </tr></table>
      </td>
    </tr>

    <!-- P\xE4ti\u010Dka -->
    <tr>
      <td class="px" style="background:${C.brown};padding:28px 36px;" align="center">
        <img src="${base}img/email/logo-white.png" width="110" alt="GYM ONE" style="width:110px;height:auto;margin:0 auto 14px;">
        <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#C9B8A4;">M\xE1\u0161 ot\xE1zku? Odpovedz na tento e-mail alebo n\xE1m zavolaj.</p>
        <p style="margin:0 0 14px;font-size:13px;line-height:20px;">
          <a href="tel:${GYM.phone.replace(/\s/g, "")}" style="color:${C.cream};text-decoration:none;">${GYM.phone}</a>
          <span style="color:#7d6552;">&nbsp;\xB7&nbsp;</span>
          <a href="mailto:${GYM.email}" style="color:${C.cream};text-decoration:none;">${GYM.email}</a>
          <span style="color:#7d6552;">&nbsp;\xB7&nbsp;</span>
          <a href="${GYM.instagram}" style="color:${C.cream};text-decoration:none;">Instagram</a>
        </p>
        <p style="margin:0;font-size:11px;line-height:17px;color:#8f7a66;">
          ${GYM.name} \xB7 ${GYM.street}, ${GYM.city}<br>
          Tento e-mail ti pri\u0161iel, preto\u017Ee si v appke GYM ONE vykonal(a) objedn\xE1vku. Prev\xE1dzkov\xFD poriadok a VOP n\xE1jde\u0161 na <a href="${GYM.web}" style="color:#C9B8A4;">gymone.sk</a>.
        </p>
      </td>
    </tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
  const text = [
    test ? "[TESTOVAC\xCD RE\u017DIM \u2013 platba nebola re\xE1lne strhnut\xE1]\n" : "",
    `\u010Eakujeme, ${firstName}!`,
    "",
    isFree ? "Tvoj prv\xFD vstup do GYM ONE je pripraven\xFD." : `Tvoja objedn\xE1vka \u201E${pass.title}\u201C je zaplaten\xE1 a aktivovan\xE1.`,
    "",
    `K\xD3D NA VSTUP: ${pass.code}`,
    `QR k\xF3d: ${qr}`,
    "",
    "S\xDAHRN OBJEDN\xC1VKY",
    ...rows.map(([k, v]) => `${k}: ${String(v).replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, "")}`),
    `Spolu: ${eur(pass.price)}`,
    "",
    "OTV\xC1RACIE HODINY",
    "Po \u2013 Pi 05:30 \u2013 22:00, So \u2013 Ne a sviatky 07:00 \u2013 22:00",
    "",
    `${GYM.name}, ${GYM.street}, ${GYM.city}`,
    `${GYM.phone} \xB7 ${GYM.email}`,
    `Moja karta v appke: ${base}#pass`
  ].join("\n");
  return { subject, html, text, preheader };
}

// worker.js
var STRIPE = "https://api.stripe.com/v1";
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (!env.STRIPE_SECRET_KEY || !env.APP_URL) throw httpError(500, "Server nie je nakonfigurovan\xFD (STRIPE_SECRET_KEY, APP_URL).");
      let res;
      if (url.pathname === "/api/checkout" && req.method === "POST") res = await checkout(req, env);
      else if (url.pathname === "/api/verify" && req.method === "GET") res = await verify(url, env);
      else if (url.pathname === "/api/webhook" && req.method === "POST") return await webhook(req, env);
      else if (url.pathname === "/api/free" && req.method === "POST") res = await free(req, env);
      else if (url.pathname === "/" || url.pathname === "/api/health") res = { ok: true, mode: isTest(env) ? "test" : "live" };
      else throw httpError(404, "Nen\xE1jden\xE9");
      return json(res, 200, cors);
    } catch (e) {
      console.error(e);
      return json({ error: e.expose ? e.message : "Nastala chyba servera. Sk\xFAs to znova." }, e.status || 500, cors);
    }
  }
};
async function checkout(req, env) {
  const body = await readJson(req);
  const product = productById(body.productId);
  if (!product || product.price <= 0) throw httpError(400, "Neplatn\xFD produkt.");
  const customer = validateCustomer(body);
  const app = appUrl(env);
  const params = {
    mode: "payment",
    locale: "sk",
    customer_email: customer.email,
    success_url: `${app}?paid={CHECKOUT_SESSION_ID}#pass`,
    cancel_url: `${app}?canceled=1#shop`,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": Math.round(product.price * 100),
    "line_items[0][price_data][product_data][name]": `GYM ONE \u2013 ${product.title}`,
    "line_items[0][price_data][product_data][description]": product.desc,
    "payment_intent_data[description]": `GYM ONE Tren\u010D\xEDn \u2013 ${product.title}`,
    "payment_intent_data[receipt_email]": customer.email,
    "metadata[productId]": product.id,
    "metadata[name]": customer.name,
    "metadata[phone]": customer.phone,
    "metadata[start]": customer.start
  };
  const session = await stripe(env, "POST", "/checkout/sessions", params);
  return { url: session.url, id: session.id };
}
async function verify(url, env) {
  const id = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) throw httpError(400, "Neplatn\xE9 ID platby.");
  const session = await stripe(env, "GET", `/checkout/sessions/${id}?expand[]=payment_intent.payment_method`);
  if (session.payment_status !== "paid") return { paid: false, status: session.payment_status };
  const pass = passFromSession(session);
  if (!env.STRIPE_WEBHOOK_SECRET) await sendOnce(env, session, pass);
  return { paid: true, pass, test: isTest(env) };
}
async function webhook(req, env) {
  const raw = await req.text();
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("webhook secret missing", { status: 400 });
  const ok = await verifyStripeSignature(raw, req.headers.get("stripe-signature") || "", env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response("invalid signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = await stripe(env, "GET", `/checkout/sessions/${event.data.object.id}?expand[]=payment_intent.payment_method`);
    if (session.payment_status === "paid") await sendOnce(env, session, passFromSession(session));
  }
  return new Response("ok");
}
async function free(req, env) {
  const body = await readJson(req);
  const customer = validateCustomer(body);
  const product = productById("free");
  const rand = crypto.getRandomValues(new Uint32Array(2)).join("-");
  const code = codeFrom(`free:${customer.email}:${rand}`);
  const pass = buildPass({ product, start: customer.start, owner: customer.name, email: customer.email, code, method: "free" });
  await sendEmail(env, customer.email, customer.name, renderConfirmationEmail({ pass, appUrl: appUrl(env), test: false }));
  return { pass, emailed: true };
}
function passFromSession(session) {
  const m = session.metadata || {};
  const product = productById(m.productId);
  if (!product) throw httpError(400, "Nezn\xE1my produkt v platbe.");
  const wallet = session.payment_intent?.payment_method?.card?.wallet?.type;
  const method = wallet === "apple_pay" ? "apple" : wallet === "google_pay" ? "google" : session.payment_intent?.payment_method?.type === "link" ? "link" : "card";
  return buildPass({
    product,
    start: m.start,
    owner: m.name,
    email: session.customer_details?.email || session.customer_email,
    code: codeFrom(session.id),
    method,
    orderId: (session.payment_intent?.id || session.id).slice(-12).toUpperCase(),
    purchasedAt: new Date(session.created * 1e3).toISOString()
  });
}
async function sendOnce(env, session, pass) {
  if (session.metadata?.email_sent === "1") return;
  await sendEmail(env, pass.email, pass.owner, renderConfirmationEmail({ pass, appUrl: appUrl(env), test: isTest(env) }));
  await stripe(env, "POST", `/checkout/sessions/${session.id}`, { "metadata[email_sent]": "1" }).catch((e) => console.error("metadata", e));
}
async function sendEmail(env, to, name, mail) {
  const replyTo = env.REPLY_TO || "info@gymone.sk";
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM || "GYM ONE <onboarding@resend.dev>", to: [to], reply_to: replyTo, subject: mail.subject, html: mail.html, text: mail.text })
    });
    if (!r.ok) throw new Error("Resend: " + await r.text());
    return;
  }
  if (env.EMAILJS_SERVICE_ID) {
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID,
        template_id: env.EMAILJS_TEMPLATE_ID,
        user_id: env.EMAILJS_PUBLIC_KEY,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: { to_email: to, to_name: name, reply_to: replyTo, subject: mail.subject, html: mail.html, text: mail.text }
      })
    });
    if (!r.ok) throw new Error("EmailJS: " + await r.text());
    return;
  }
  console.warn("E-mail nie je nakonfigurovan\xFD \u2013 preskakujem odoslanie.");
}
async function stripe(env, method, path, params) {
  const init = { method, headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Stripe-Version": "2024-06-20" } };
  if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  }
  const r = await fetch(STRIPE + path, init);
  const data = await r.json();
  if (!r.ok) {
    console.error("Stripe", data);
    throw httpError(502, data.error?.message || "Chyba platobnej br\xE1ny.");
  }
  return data;
}
async function verifyStripeSignature(payload, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(Date.now() / 1e3 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => timingSafeEqual(s, hex));
}
var timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};
function validateCustomer(b) {
  const name = String(b.name || "").trim().slice(0, 80);
  const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
  const phone = String(b.phone || "").trim().slice(0, 30);
  const start = String(b.start || "");
  if (name.length < 3) throw httpError(400, "Zadaj meno a priezvisko.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Zadaj platn\xFD e-mail.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw httpError(400, "Neplatn\xFD d\xE1tum za\u010Diatku.");
  const today = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (start < today) throw httpError(400, "D\xE1tum za\u010Diatku nem\xF4\u017Ee by\u0165 v minulosti.");
  return { name, email, phone, start };
}
var isTest = (env) => String(env.STRIPE_SECRET_KEY).startsWith("sk_test_");
var appUrl = (env) => env.APP_URL.endsWith("/") ? env.APP_URL : env.APP_URL + "/";
function corsHeaders(req, env) {
  const allowed = env.APP_URL ? new URL(env.APP_URL).origin : "*";
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && (origin === allowed || origin.startsWith("http://localhost")) ? origin : allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}
var json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  e.expose = true;
  return e;
}
async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw httpError(400, "Neplatn\xE9 d\xE1ta.");
  }
}
export {
  worker_default as default
};

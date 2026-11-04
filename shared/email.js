// Potvrdzovací e-mail GYM ONE – HTML (tabuľkový layout pre všetky e-mailové klienty) + textová verzia.
// Používa ho server (reálne odoslanie) aj appka (náhľad).

const C = { olive: "#737A59", brown: "#331F12", wood: "#A57B5B", cream: "#F4EFE6", line: "#E6DDCF", muted: "#7A6C5F", text: "#2A1B10" };

const GYM = {
  name: "GYM ONE",
  street: "Gen. M. R. Štefánika 6833",
  city: "911 01 Trenčín",
  phone: "+421 911 296 014",
  email: "info@gymone.sk",
  web: "https://www.gymone.sk",
  instagram: "https://www.instagram.com/gymone91101/",
  nav: "https://www.google.com/maps/dir/?api=1&destination=48.894554,18.062685",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${+d}. ${+m}. ${y}`; };
const eur = (n) => (Number.isInteger(n) ? `${n},00` : n.toFixed(2).replace(".", ",")) + " €";
const METHODS = { card: "Platobná karta", apple: "Apple Pay", google: "Google Pay", link: "Stripe Link", free: "Zadarmo", demo: "Demo platba" };

/**
 * @param {object} o
 * @param {object} o.pass     záznam z buildPass()
 * @param {string} o.appUrl   adresa appky (končí /)
 * @param {boolean} [o.test]  testovací režim platobnej brány
 */
export function renderConfirmationEmail({ pass, appUrl, test = false }) {
  const base = appUrl.endsWith("/") ? appUrl : appUrl + "/";
  const firstName = (pass.owner || "").trim().split(/\s+/)[0] || "športovec";
  const isFree = pass.price === 0;
  const isSingle = pass.entriesTotal === 1;
  const subject = isFree
    ? `Tvoj vstup zadarmo do GYM ONE je pripravený · ${pass.code}`
    : `Potvrdenie objednávky: ${pass.title} · ${pass.code}`;
  const preheader = isFree
    ? "Ukáž QR kód na recepcii a prvý tréning máš na nás."
    : `Platba ${eur(pass.price)} prebehla úspešne. Tvoj QR kód na vstup je v e-maile.`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=0&ecc=M&color=331F12&bgcolor=FFFFFF&data=${encodeURIComponent("GYMONE:" + pass.code)}`;
  const purchased = new Date(pass.purchasedAt);
  const purchasedStr = new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(purchased);

  const validity = isSingle && pass.start === pass.end
    ? fmtDate(pass.start)
    : `${fmtDate(pass.start)} – ${fmtDate(pass.end)}`;

  const rows = [
    ["Produkt", esc(pass.title)],
    [isSingle && pass.start === pass.end ? "Deň vstupu" : "Platnosť", validity],
    pass.entriesTotal ? ["Počet vstupov", String(pass.entriesTotal)] : ["Typ", "Neobmedzený vstup"],
    ["Držiteľ", esc(pass.owner)],
    ["Číslo objednávky", esc(pass.orderId || pass.code)],
    ["Dátum nákupu", purchasedStr],
    ["Spôsob platby", METHODS[pass.pm] || "Platobná karta"],
  ];

  const row = ([k, v], i) => `
      <tr>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;color:${C.muted};">${k}</td>
        <td align="right" style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;color:${C.text};font-weight:600;">${v}</td>
      </tr>`;

  const step = (n, title, text) => `
      <tr>
        <td width="44" valign="top" style="padding:0 0 16px;">
          <div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:${C.olive};color:#fff;text-align:center;font-weight:700;font-size:14px;">${n}</div>
        </td>
        <td valign="top" style="padding:4px 0 16px;font-size:14px;line-height:21px;color:${C.text};">
          <strong>${title}</strong><br><span style="color:${C.muted};">${text}</span>
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
    ${test ? `<tr><td style="background:#FFF4D6;color:#7A5B00;font-size:12px;text-align:center;padding:8px 16px;">TESTOVACÍ REŽIM – platba nebola reálne strhnutá</td></tr>` : ""}
    <!-- Hlavička -->
    <tr>
      <td style="background:${C.brown};padding:26px 36px;" class="px">
        <table role="presentation" width="100%"><tr>
          <td><a href="${base}"><img src="${base}img/email/logo-white.png" width="150" alt="GYM ONE" style="width:150px;height:auto;"></a></td>
          <td align="right" style="font-size:12px;letter-spacing:1.5px;color:#C9B8A4;text-transform:uppercase;">${isFree ? "Uvítací vstup" : "Potvrdenie objednávky"}</td>
        </tr></table>
      </td>
    </tr>
    <!-- Fotka -->
    <tr><td style="background:${C.brown};"><img src="${base}img/email/hero.jpg" width="600" alt="Interiér GYM ONE Trenčín" style="width:100%;max-width:600px;height:auto;"></td></tr>

    <!-- Pozdrav -->
    <tr>
      <td class="px" style="padding:36px 36px 8px;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:1.6px;text-transform:uppercase;color:${C.olive};font-weight:600;">${isFree ? "Vitaj v komunite" : "Platba prijatá"}</p>
        <h1 class="h1" style="margin:0 0 16px;font-family:'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif;font-weight:400;font-size:46px;line-height:46px;color:${C.brown};letter-spacing:.5px;">Ďakujeme, ${esc(firstName)}!</h1>
        <p style="margin:0;font-size:16px;line-height:25px;color:${C.text};">
          ${isFree
            ? "Tvoj prvý vstup do GYM ONE je pripravený. Stačí prísť, ukázať QR kód nižšie na recepcii a ideš trénovať. O všetko ostatné sa postaráme my."
            : `Tvoja objednávka <strong>${esc(pass.title)}</strong> je zaplatená a aktivovaná. Nižšie nájdeš QR kód, ktorým sa preukážeš na recepcii, a všetky podrobnosti k nákupu.`}
        </p>
      </td>
    </tr>

    <!-- QR karta -->
    <tr>
      <td class="px" style="padding:28px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.brown};border-radius:16px;">
          <tr>
            <td style="padding:26px;" align="center">
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#C9B8A4;">Tvoja vstupná karta</p>
              <p style="margin:0 0 18px;font-family:'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif;font-size:30px;line-height:32px;color:${C.cream};">${esc(pass.title)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;"><tr><td style="padding:16px;">
                <img src="${qr}" width="200" height="200" alt="QR kód ${esc(pass.code)}" style="width:200px;height:200px;">
              </td></tr></table>
              <p style="margin:14px 0 2px;font-family:'Courier New',Courier,monospace;font-size:18px;letter-spacing:3px;color:${C.cream};font-weight:700;">${esc(pass.code)}</p>
              <p style="margin:0;font-size:13px;color:#C9B8A4;">Platí: ${validity}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Súhrn -->
    <tr>
      <td class="px" style="padding:0 36px 8px;">
        ${heading("Súhrn objednávky")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(row).join("")}
          <tr>
            <td style="padding:16px 0 0;border-top:2px solid ${C.brown};font-size:16px;font-weight:700;color:${C.brown};">Spolu</td>
            <td align="right" style="padding:16px 0 0;border-top:2px solid ${C.brown};font-family:'Bebas Neue',Impact,Arial,sans-serif;font-size:30px;color:${C.olive};">${eur(pass.price)}</td>
          </tr>
          ${isFree ? "" : `<tr><td colspan="2" style="padding:4px 0 0;font-size:12px;color:${C.muted};">Cena vrátane DPH. Doklad o platbe ti platobná brána posiela samostatným e-mailom.</td></tr>`}
        </table>
      </td>
    </tr>

    <!-- Tlačidlo -->
    <tr>
      <td class="px" align="center" style="padding:28px 36px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:999px;background:${C.olive};">
            <a href="${base}#pass" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:.3px;">Otvoriť moju kartu v appke</a>
          </td>
        </tr></table>
      </td>
    </tr>

    <!-- Ako vstúpiť -->
    <tr>
      <td class="px" style="padding:32px 36px 4px;">
        ${heading("Ako vstúpiť")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${step(1, "Príď do GYM ONE", `${GYM.street}, Trenčín – parkovanie priamo pri budove.`)}
          ${step(2, "Ukáž QR kód na recepcii", "Z tohto e-mailu alebo z appky (sekcia Karta). Zvýš si jas displeja.")}
          ${pass.productId === "m1s" || pass.productId === "s1s" ? step(3, "Maj pri sebe ISIC", "Študentskú zľavu overíme pri prvom vstupe.")
            : pass.productId === "m1x" || pass.productId === "s1x" ? step(3, "Maj pri sebe občiansky preukaz", "Seniorskú zľavu (65+) overíme pri prvom vstupe.")
            : pass.multisport ? step(3, "Ukáž kartu MultiSport / UpBalansea", "Plastovú kartu s dokladom totožnosti alebo virtuálnu kartu v mobile.")
            : step(3, "Uterák a čistá obuv", "Do posilňovne si prines uterák a čistú športovú obuv. Šatne so skrinkami máš k dispozícii.")}
        </table>
      </td>
    </tr>

    <!-- Hodiny + adresa -->
    <tr>
      <td class="px" style="padding:20px 36px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td class="col" width="50%" valign="top" style="background:${C.cream};border-radius:14px;padding:20px;">
            <p style="margin:0 0 10px;font-family:'Bebas Neue',Impact,Arial,sans-serif;font-size:20px;color:${C.brown};">Otváracie hodiny</p>
            <p style="margin:0;font-size:14px;line-height:24px;color:${C.text};">Po – Pi&nbsp;&nbsp;<strong>05:30 – 22:00</strong><br>So – Ne&nbsp;&nbsp;<strong>07:00 – 22:00</strong><br>Sviatky&nbsp;&nbsp;<strong>07:00 – 22:00</strong></p>
          </td>
          <td class="col col-gap" width="50%" valign="top" style="padding-left:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${C.cream};border-radius:14px;padding:20px;">
              <p style="margin:0 0 10px;font-family:'Bebas Neue',Impact,Arial,sans-serif;font-size:20px;color:${C.brown};">Kde nás nájdeš</p>
              <p style="margin:0 0 10px;font-size:14px;line-height:22px;color:${C.text};">${GYM.street}<br>${GYM.city}</p>
              <a href="${GYM.nav}" style="font-size:14px;font-weight:600;color:${C.olive};text-decoration:none;">Navigovať &rarr;</a>
            </td></tr></table>
          </td>
        </tr></table>
      </td>
    </tr>

    <!-- Pätička -->
    <tr>
      <td class="px" style="background:${C.brown};padding:28px 36px;" align="center">
        <img src="${base}img/email/logo-white.png" width="110" alt="GYM ONE" style="width:110px;height:auto;margin:0 auto 14px;">
        <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#C9B8A4;">Máš otázku? Odpovedz na tento e-mail alebo nám zavolaj.</p>
        <p style="margin:0 0 14px;font-size:13px;line-height:20px;">
          <a href="tel:${GYM.phone.replace(/\s/g, "")}" style="color:${C.cream};text-decoration:none;">${GYM.phone}</a>
          <span style="color:#7d6552;">&nbsp;·&nbsp;</span>
          <a href="mailto:${GYM.email}" style="color:${C.cream};text-decoration:none;">${GYM.email}</a>
          <span style="color:#7d6552;">&nbsp;·&nbsp;</span>
          <a href="${GYM.instagram}" style="color:${C.cream};text-decoration:none;">Instagram</a>
        </p>
        <p style="margin:0;font-size:11px;line-height:17px;color:#8f7a66;">
          ${GYM.name} · ${GYM.street}, ${GYM.city}<br>
          Tento e-mail ti prišiel, pretože si v appke GYM ONE vykonal(a) objednávku. Prevádzkový poriadok a VOP nájdeš na <a href="${GYM.web}" style="color:#C9B8A4;">gymone.sk</a>.
        </p>
      </td>
    </tr>
  </table>

</td></tr>
</table>
</body>
</html>`;

  const text = [
    test ? "[TESTOVACÍ REŽIM – platba nebola reálne strhnutá]\n" : "",
    `Ďakujeme, ${firstName}!`,
    "",
    isFree ? "Tvoj prvý vstup do GYM ONE je pripravený." : `Tvoja objednávka „${pass.title}“ je zaplatená a aktivovaná.`,
    "",
    `KÓD NA VSTUP: ${pass.code}`,
    `QR kód: ${qr}`,
    "",
    "SÚHRN OBJEDNÁVKY",
    ...rows.map(([k, v]) => `${k}: ${String(v).replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, "")}`),
    `Spolu: ${eur(pass.price)}`,
    "",
    "OTVÁRACIE HODINY",
    "Po – Pi 05:30 – 22:00, So – Ne a sviatky 07:00 – 22:00",
    "",
    `${GYM.name}, ${GYM.street}, ${GYM.city}`,
    `${GYM.phone} · ${GYM.email}`,
    `Moja karta v appke: ${base}#pass`,
  ].join("\n");

  return { subject, html, text, preheader };
}

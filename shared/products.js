// Spoločný cenník a výpočty – používa ho appka aj platobný server,
// aby si nikto nemohol v prehliadači zmeniť cenu.

export const PRODUCTS = [
  // Permanentky
  { id: "m1", cat: "perm", title: "Permanentka 1 mesiac", price: 59, months: 1, desc: "Neobmedzený vstup počas 30 dní do všetkých zón." },
  { id: "m1s", cat: "perm", title: "Študent – 1 mesiac", price: 50, months: 1, desc: "Pre študentov s platným ISIC. Neobmedzený vstup." },
  { id: "m1x", cat: "perm", title: "Senior – 1 mesiac", price: 50, months: 1, desc: "Pre seniorov nad 65 rokov. Neobmedzený vstup." },
  { id: "m3", cat: "perm", title: "3 mesiace", price: 165, months: 3, desc: "Neobmedzený vstup na 3 mesiace.", per: "55 € / mesiac", badge: "Obľúbené" },
  { id: "m12", cat: "perm", title: "12 mesiacov", price: 600, months: 12, desc: "Celý rok tréningu bez obmedzení.", per: "50 € / mesiac", badge: "Najvýhodnejšie" },
  // Vstupy
  { id: "e10", cat: "entries", title: "10 vstupov", price: 65, entries: 10, days: 90, desc: "Platnosť 90 dní od začiatku.", per: "6,50 € / vstup" },
  { id: "e20", cat: "entries", title: "20 vstupov", price: 120, entries: 20, days: 90, desc: "Platnosť 90 dní od začiatku.", per: "6 € / vstup", badge: "Výhodné" },
  // Extras
  { id: "s1", cat: "extras", title: "Jednorazový vstup", price: 7, entries: 1, days: 1, desc: "Jeden vstup na zvolený deň." },
  { id: "s1s", cat: "extras", title: "Študentský vstup", price: 5, entries: 1, days: 1, desc: "Jeden vstup so študentským preukazom." },
  { id: "s1x", cat: "extras", title: "Seniorský vstup", price: 4, entries: 1, days: 1, desc: "Jeden vstup pre seniorov nad 65 rokov." },
  { id: "ms", cat: "extras", title: "MultiSport / UpBalansea", price: 5, months: 12, multisport: true, desc: "Vstup s kartou za 0 € po jednorazovom poplatku 5 €. Kartu ukáž na recepcii." },
  // Skrytý – promo
  { id: "free", cat: "hidden", title: "Prvý vstup zadarmo", price: 0, entries: 1, days: 30, desc: "Uvítací vstup pre nových členov (platí 30 dní)." },
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);

const pad2 = (n) => String(n).padStart(2, "0");
export const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoDate(d); };
export const addMonths = (iso, n) => {
  const d = parseISO(iso); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last)); d.setDate(d.getDate() - 1);
  return isoDate(d);
};

/** Koniec platnosti podľa produktu a dátumu začiatku (vrátane posledného dňa). */
export const endDate = (product, start) =>
  product.months ? addMonths(start, product.months) : addDays(start, (product.days || 1) - 1);

/** Kód permanentky z ľubovoľného ID (napr. Stripe session) – stabilný a čitateľný. */
export function codeFrom(id) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < id.length; i++) {
    h1 = Math.imul(h1 ^ id.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + id.charCodeAt(i), 2246822519) >>> 0;
  }
  const s = (h1.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(8, "X");
  return `G1-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

/** Zostaví záznam permanentky (rovnaký tvar v appke aj na serveri). */
export function buildPass({ product, start, owner, email, code, method, orderId, purchasedAt }) {
  return {
    id: code, code, orderId: orderId || code, productId: product.id, title: product.title,
    price: product.price, pm: method || "card",
    type: product.entries ? "entries" : "time", multisport: !!product.multisport,
    start, end: endDate(product, start),
    entriesTotal: product.entries || null, entriesLeft: product.entries || null,
    owner, email, purchasedAt: purchasedAt || new Date().toISOString(), log: [],
  };
}

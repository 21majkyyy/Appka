# Zapojenie platobnej brány a e-mailov

Appka má dva režimy:

| Režim | Kedy | Platba | E-mail |
|---|---|---|---|
| **DEMO** | `apiUrl` v `config.js` je prázdne (teraz) | simulovaná | zobrazí sa náhľad v appke (alebo sa pošle cez EmailJS, ak ho vyplníš) |
| **OSTRÝ** | `apiUrl` je vyplnené | **Stripe** – karta, Apple Pay, Google Pay | server pošle potvrdenie s QR kódom automaticky |

Postup trvá cca 20 minút a dá sa spraviť celý v prehliadači (aj v mobile). Všetky služby majú bezplatný režim.

---

## 1. Stripe (platobná brána)

1. Zaregistruj sa na **https://dashboard.stripe.com/register** (krajina Slovensko).
2. Vpravo hore nechaj zapnutý **Test mode** – skúšaš bez skutočných peňazí.
3. **Developers → API keys** → skopíruj **Secret key** (`sk_test_…`).
4. Na ostrú prevádzku neskôr dokončíš overenie firmy (IČO, bankový účet) a použiješ `sk_live_…`.

> Apple Pay a Google Pay zapneš v **Settings → Payment methods** (bývajú zapnuté automaticky).
> Doklad o platbe zákazníkovi posiela Stripe: **Settings → Customer emails → Successful payments** zapnúť.

## 2. E-maily (vyber jednu možnosť)

### A) EmailJS – najjednoduchšie, posiela z tvojho Gmailu
1. Registrácia na **https://www.emailjs.com** (zadarmo 200 e-mailov/mesiac).
2. **Email Services → Add New Service → Gmail** → prihlás sa → skopíruj **Service ID**.
3. **Email Templates → Create New Template**:
   - **Subject:** `{{subject}}`
   - **To Email:** `{{to_email}}`
   - **From Name:** `GYM ONE`
   - **Reply To:** `{{reply_to}}`
   - **Content:** prepni na **Code editor** (`<>`) a vlož len: `{{{html}}}` (tri zátvorky!)
   - Ulož → skopíruj **Template ID**.
4. **Account → General** → skopíruj **Public Key**; **Account → Security** → vytvor **Private Key**
   a zapni **Allow EmailJS API for non-browser applications**.

### B) Resend – profesionálne, odosielateľ `noreply@gymone.sk`
Potrebuješ prístup k DNS domény gymone.sk. Na **https://resend.com** pridaj doménu, over DNS záznamy
a vytvor API kľúč. Na serveri nastav `RESEND_API_KEY` a `EMAIL_FROM` = `GYM ONE <noreply@gymone.sk>`.

## 3. Server (Cloudflare Worker – zadarmo)

1. Registrácia na **https://dash.cloudflare.com/sign-up**.
2. **Workers & Pages → Create → Create Worker** → názov `gymone-pay` → **Deploy**.
3. **Edit code** → zmaž všetko a vlož celý obsah súboru
   [`server/dist/worker.js`](server/dist/worker.js) → **Deploy**.
4. **Settings → Variables and Secrets → Add** (typ *Secret* pre kľúče):

   | Názov | Hodnota |
   |---|---|
   | `APP_URL` | `https://21majkyyy.github.io/Appka/` |
   | `STRIPE_SECRET_KEY` | `sk_test_…` |
   | `EMAILJS_SERVICE_ID` | z kroku 2A |
   | `EMAILJS_TEMPLATE_ID` | z kroku 2A |
   | `EMAILJS_PUBLIC_KEY` | z kroku 2A |
   | `EMAILJS_PRIVATE_KEY` | z kroku 2A |
   | `REPLY_TO` | `info@gymone.sk` |

5. Skopíruj adresu workera, napr. `https://gymone-pay.tvoje-meno.workers.dev`.
   Kontrola: `…workers.dev/api/health` má vrátiť `{"ok":true,"mode":"test"}`.

### Webhook (odporúčané)
Zaistí odoslanie e-mailu, aj keď zákazník po zaplatení zavrie prehliadač.
1. Stripe → **Developers → Webhooks → Add endpoint**
   - URL: `https://gymone-pay.tvoje-meno.workers.dev/api/webhook`
   - Udalosti: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
2. Skopíruj **Signing secret** (`whsec_…`) a pridaj ho do workera ako `STRIPE_WEBHOOK_SECRET`.

## 4. Zapnutie v appke

V súbore `config.js` vyplň:
```js
apiUrl: "https://gymone-pay.tvoje-meno.workers.dev",
```
Ulož, nahraj na GitHub (vetva `gh-pages`) a appka začne platiť cez Stripe.

## 5. Test
Kúp si v appke permanentku a na stránke Stripe zadaj testovaciu kartu:
`4242 4242 4242 4242`, platnosť napr. `12/30`, CVC `123`.
Po zaplatení sa vrátiš do appky s QR kódom a na e-mail príde potvrdenie.

---

### Ako to funguje
1. Zákazník vyplní údaje → appka zavolá server `/api/checkout`.
2. Server vytvorí platbu v Stripe **s cenou zo serverového cenníka** (cena sa nedá zmeniť v prehliadači) a presmeruje na zabezpečenú stránku Stripe.
3. Po zaplatení Stripe vráti zákazníka do appky → `/api/verify` overí platbu a vytvorí permanentku s QR kódom.
4. Server (webhook alebo overenie) pošle potvrdzovací e-mail – raz, bez duplicít.

Údaje o karte nikdy neprechádzajú cez appku ani server GYM ONE – spracúva ich iba Stripe (PCI DSS).

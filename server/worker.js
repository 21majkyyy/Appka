// GYM ONE – platobný a e-mailový server (Cloudflare Worker)
//
// Endpoints:
//   POST /api/checkout  → vytvorí Stripe Checkout (karta, Apple Pay, Google Pay) a vráti URL platobnej brány
//   GET  /api/verify    → po návrate z brány overí platbu a vráti permanentku
//   POST /api/webhook   → Stripe webhook (checkout.session.completed) – odošle potvrdzovací e-mail
//   POST /api/free      → uvítací vstup zadarmo + e-mail
//
// Premenné prostredia (Settings → Variables and Secrets):
//   STRIPE_SECRET_KEY      sk_test_… alebo sk_live_…            (povinné)
//   APP_URL                https://21majkyyy.github.io/Appka/    (povinné)
//   STRIPE_WEBHOOK_SECRET  whsec_…                               (odporúčané)
//   E-mail – vyber jedno:
//     RESEND_API_KEY + EMAIL_FROM ("GYM ONE <noreply@gymone.sk>")
//     EMAILJS_SERVICE_ID + EMAILJS_TEMPLATE_ID + EMAILJS_PUBLIC_KEY + EMAILJS_PRIVATE_KEY
//   REPLY_TO               info@gymone.sk                        (voliteľné)

import { productById, buildPass, codeFrom } from "../shared/products.js";
import { renderConfirmationEmail } from "../shared/email.js";

const STRIPE = "https://api.stripe.com/v1";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      if (!env.STRIPE_SECRET_KEY || !env.APP_URL) throw httpError(500, "Server nie je nakonfigurovaný (STRIPE_SECRET_KEY, APP_URL).");
      let res;
      if (url.pathname === "/api/checkout" && req.method === "POST") res = await checkout(req, env);
      else if (url.pathname === "/api/verify" && req.method === "GET") res = await verify(url, env);
      else if (url.pathname === "/api/webhook" && req.method === "POST") return await webhook(req, env);
      else if (url.pathname === "/api/free" && req.method === "POST") res = await free(req, env);
      else if (url.pathname === "/" || url.pathname === "/api/health") res = { ok: true, mode: isTest(env) ? "test" : "live" };
      else throw httpError(404, "Nenájdené");
      return json(res, 200, cors);
    } catch (e) {
      console.error(e);
      return json({ error: e.expose ? e.message : "Nastala chyba servera. Skús to znova." }, e.status || 500, cors);
    }
  },
};

// ------------------------------------------------------------------ handlers

async function checkout(req, env) {
  const body = await readJson(req);
  const product = productById(body.productId);
  if (!product || product.price <= 0) throw httpError(400, "Neplatný produkt.");
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
    "line_items[0][price_data][product_data][name]": `GYM ONE – ${product.title}`,
    "line_items[0][price_data][product_data][description]": product.desc,
    "payment_intent_data[description]": `GYM ONE Trenčín – ${product.title}`,
    "payment_intent_data[receipt_email]": customer.email,
    "metadata[productId]": product.id,
    "metadata[name]": customer.name,
    "metadata[phone]": customer.phone,
    "metadata[start]": customer.start,
  };
  const session = await stripe(env, "POST", "/checkout/sessions", params);
  return { url: session.url, id: session.id };
}

async function verify(url, env) {
  const id = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) throw httpError(400, "Neplatné ID platby.");
  const session = await stripe(env, "GET", `/checkout/sessions/${id}?expand[]=payment_intent.payment_method`);
  if (session.payment_status !== "paid") return { paid: false, status: session.payment_status };
  const pass = passFromSession(session);
  // Bez webhooku pošleme e-mail pri prvom overení
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

// ------------------------------------------------------------------ helpers

function passFromSession(session) {
  const m = session.metadata || {};
  const product = productById(m.productId);
  if (!product) throw httpError(400, "Neznámy produkt v platbe.");
  const wallet = session.payment_intent?.payment_method?.card?.wallet?.type;
  const method = wallet === "apple_pay" ? "apple" : wallet === "google_pay" ? "google" : session.payment_intent?.payment_method?.type === "link" ? "link" : "card";
  return buildPass({
    product, start: m.start, owner: m.name, email: session.customer_details?.email || session.customer_email,
    code: codeFrom(session.id), method, orderId: (session.payment_intent?.id || session.id).slice(-12).toUpperCase(),
    purchasedAt: new Date(session.created * 1000).toISOString(),
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
      body: JSON.stringify({ from: env.EMAIL_FROM || "GYM ONE <onboarding@resend.dev>", to: [to], reply_to: replyTo, subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (!r.ok) throw new Error("Resend: " + (await r.text()));
    return;
  }
  if (env.EMAILJS_SERVICE_ID) {
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID, template_id: env.EMAILJS_TEMPLATE_ID,
        user_id: env.EMAILJS_PUBLIC_KEY, accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: { to_email: to, to_name: name, reply_to: replyTo, subject: mail.subject, html: mail.html, text: mail.text },
      }),
    });
    if (!r.ok) throw new Error("EmailJS: " + (await r.text()));
    return;
  }
  console.warn("E-mail nie je nakonfigurovaný – preskakujem odoslanie.");
}

async function stripe(env, method, path, params) {
  const init = { method, headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Stripe-Version": "2024-06-20" } };
  if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  }
  const r = await fetch(STRIPE + path, init);
  const data = await r.json();
  if (!r.ok) { console.error("Stripe", data); throw httpError(502, data.error?.message || "Chyba platobnej brány."); }
  return data;
}

async function verifyStripeSignature(payload, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => timingSafeEqual(s, hex));
}
const timingSafeEqual = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

function validateCustomer(b) {
  const name = String(b.name || "").trim().slice(0, 80);
  const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
  const phone = String(b.phone || "").trim().slice(0, 30);
  const start = String(b.start || "");
  if (name.length < 3) throw httpError(400, "Zadaj meno a priezvisko.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Zadaj platný e-mail.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw httpError(400, "Neplatný dátum začiatku.");
  const today = new Date(Date.now() - 864e5).toISOString().slice(0, 10); // tolerancia časových pásiem
  if (start < today) throw httpError(400, "Dátum začiatku nemôže byť v minulosti.");
  return { name, email, phone, start };
}

const isTest = (env) => String(env.STRIPE_SECRET_KEY).startsWith("sk_test_");
const appUrl = (env) => (env.APP_URL.endsWith("/") ? env.APP_URL : env.APP_URL + "/");
function corsHeaders(req, env) {
  const allowed = env.APP_URL ? new URL(env.APP_URL).origin : "*";
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && (origin === allowed || origin.startsWith("http://localhost")) ? origin : allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
function httpError(status, message) { const e = new Error(message); e.status = status; e.expose = true; return e; }
async function readJson(req) { try { return await req.json(); } catch { throw httpError(400, "Neplatné dáta."); } }

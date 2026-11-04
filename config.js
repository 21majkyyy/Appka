// Nastavenia appky GYM ONE.
// Kým je apiUrl prázdne, appka beží v DEMO režime (platba sa len simuluje).
window.GYMONE_CONFIG = {
  // Adresa, kde appka beží (používa sa v e-mailoch pre obrázky a odkazy)
  appUrl: "https://21majkyyy.github.io/Appka/",

  // URL platobného servera (Cloudflare Worker), napr. "https://gymone-pay.tvoje-meno.workers.dev"
  // Po vyplnení sa platí skutočne cez Stripe a e-maily posiela server.
  apiUrl: "",

  // Voliteľné: odosielanie e-mailov priamo z appky cez EmailJS aj v DEMO režime (bez servera).
  // Vyplň z emailjs.com → Account (Public Key), Email Services (Service ID), Email Templates (Template ID).
  emailjs: { publicKey: "", serviceId: "", templateId: "" },
};

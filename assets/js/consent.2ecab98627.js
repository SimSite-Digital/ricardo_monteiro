const KEY = 'rm-consent'; // 'granted' | 'denied'
const body = document.body;
const gaId = body.dataset.ga || '';
const read = () => {
try { return localStorage.getItem(KEY); } catch { return null; }
};
const write = (value) => {
try { localStorage.setItem(KEY, value); } catch { /* private mode: ask again next visit */ }
};
let loaded = false;
function loadAnalytics() {
if (loaded || !gaId) return;
loaded = true;
window[`ga-disable-${gaId}`] = false;
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', gaId);
const script = document.createElement('script');
script.async = true;
script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
document.head.appendChild(script);
}
function stopAnalytics() {
if (!gaId) return;
window[`ga-disable-${gaId}`] = true;
const host = location.hostname.replace(/^www\./, '');
document.cookie.split(';').map((c) => c.split('=')[0].trim())
.filter((name) => name === '_ga' || name.startsWith('_ga_'))
.forEach((name) => {
[host, `.${host}`, ''].forEach((domain) => {
document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
});
});
}
export function trackWhatsapp(bloco, formulario = 'nao') {
if (read() !== 'granted' || !loaded || typeof window.gtag !== 'function') return;
window.gtag('event', 'contato_whatsapp', {
origem_pagina: body.dataset.page || '',
origem_bloco: bloco,
formulario,
transport_type: 'beacon', // the link opens a new tab / leaves the page
});
}
export function initConsent() {
const banner = document.querySelector('[data-cookie-banner]');
const reopen = document.querySelector('[data-consent-open]');
const choice = read();
if (choice === 'granted') loadAnalytics();
document.addEventListener('click', (event) => {
const link = event.target.closest('[data-wa]');
if (link) trackWhatsapp(link.dataset.wa, 'nao');
});
if (!banner) return;
const show = () => { banner.hidden = false; };
const hide = () => { banner.hidden = true; };
banner.addEventListener('click', (event) => {
const button = event.target.closest('[data-consent]');
if (!button) return;
const accepted = button.dataset.consent === 'accept';
write(accepted ? 'granted' : 'denied');
hide();
if (accepted) loadAnalytics();
else stopAnalytics();
if (reopen) reopen.focus();
});
if (reopen) {
reopen.hidden = false;
reopen.addEventListener('click', () => {
show();
banner.querySelector('[data-consent]')?.focus();
});
}
if (!choice) show();
}
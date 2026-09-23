import { initMenu } from './menu.a0c6e6587b.js';
const root = document.documentElement;
root.classList.add('js');
initMenu();
initMaps();
const contactForm = document.querySelector('[data-form]');
if (contactForm) {
import('./form.e148e23189.js').then(({ initForm }) => initForm(contactForm));
}
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion) {
const expressive = document.body.dataset.motion === 'expressive';
const fontsReady = Promise.race([
document.fonts?.ready ?? Promise.resolve(),
new Promise((resolve) => setTimeout(resolve, 1500)),
]);
const deferredCss = document.querySelector('link[rel="stylesheet"][data-deferred]');
const cssReady = new Promise((resolve) => {
if (!deferredCss || deferredCss.sheet) resolve();
else {
deferredCss.addEventListener('load', resolve, { once: true });
deferredCss.addEventListener('error', resolve, { once: true });
}
});
Promise.all([fontsReady, cssReady])
.then(() => import('./reveal.e66ca68169.js'))
.then(({ initReveal }) => initReveal());
if (expressive && document.querySelector('[data-timeline]')) {
cssReady
.then(() => import('./timeline.7dec50869b.js'))
.then(({ initTimeline }) => initTimeline());
}
if (expressive) {
import('./parallax.488e30665e.js').then(({ initParallax }) => initParallax());
import('./cursor.f30f74b2de.js').then(({ initCursor }) => initCursor());
}
}
function initMaps() {
document.querySelectorAll('[data-map-trigger]').forEach((trigger) => {
trigger.addEventListener('click', (event) => {
const box = trigger.closest('[data-map-src]');
if (!box) return;
event.preventDefault();
const iframe = document.createElement('iframe');
iframe.src = box.dataset.mapSrc;
iframe.title = box.dataset.mapTitle;
iframe.allowFullscreen = true;
box.replaceChildren(iframe);
box.classList.add('is-loaded');
iframe.focus();
});
});
}
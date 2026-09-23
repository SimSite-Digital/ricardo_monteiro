const DESKTOP = window.matchMedia('(min-width: 1025px)');
export function initParallax() {
const css = getComputedStyle(document.documentElement);
const titleSpeed = parseFloat(css.getPropertyValue('--parallax-title')) || 1;
const imageSpeed = parseFloat(css.getPropertyValue('--parallax-image')) || 1;
const layers = [];
const heroImage = document.querySelector('[data-parallax="image"]');
const heroTitle = document.querySelector('[data-parallax="title"]');
const hero = heroImage?.closest('.hero');
if (hero && heroImage) {
layers.push({
el: heroImage,
band: hero,
update() {
const room = heroImage.offsetHeight - heroImage.parentElement.offsetHeight;
const travel = hero.offsetHeight * (1 - imageSpeed);
const progress = Math.min(Math.max(window.scrollY / travel, 0), 1);
heroImage.style.transform = `translate3d(0, ${(progress * room).toFixed(2)}px, 0)`;
},
});
if (heroTitle) {
layers.push({
el: heroTitle,
band: hero,
update() {
heroTitle.style.transform = `translate3d(0, ${(window.scrollY * (1 - titleSpeed)).toFixed(2)}px, 0)`;
},
});
}
}
document.querySelectorAll('[data-parallax="bg"]').forEach((el) => {
const band = el.closest('section') || el.parentElement;
layers.push({
el,
band,
update() {
const rect = band.getBoundingClientRect();
const vh = window.innerHeight;
const room = el.offsetHeight - band.offsetHeight;
const progress = Math.min(Math.max((vh - rect.top) / (vh + rect.height), 0), 1);
el.style.transform = `translate3d(0, ${((0.5 - progress) * room).toFixed(2)}px, 0)`;
},
});
});
if (!layers.length) return;
const visible = new Set();
let ticking = false;
const frame = () => {
ticking = false;
if (!DESKTOP.matches) return;
layers.forEach((layer) => { if (visible.has(layer.band)) layer.update(); });
};
const request = () => {
if (!ticking) {
ticking = true;
requestAnimationFrame(frame);
}
};
const io = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) visible.add(entry.target);
else visible.delete(entry.target);
layers.filter((l) => l.band === entry.target).forEach((l) => {
l.el.style.willChange = entry.isIntersecting && DESKTOP.matches ? 'transform' : '';
});
});
request();
});
new Set(layers.map((l) => l.band)).forEach((band) => io.observe(band));
const reset = () => layers.forEach((l) => { l.el.style.transform = ''; l.el.style.willChange = ''; });
window.addEventListener('scroll', request, { passive: true });
window.addEventListener('resize', request, { passive: true });
DESKTOP.addEventListener('change', (e) => (e.matches ? request() : reset()));
}
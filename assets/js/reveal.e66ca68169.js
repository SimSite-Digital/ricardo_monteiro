const FOLD = 0.9; // elements whose top is above 90% of the viewport stay static
const css = getComputedStyle(document.documentElement);
const ms = (name) => parseFloat(css.getPropertyValue(name)) || 0;
const originals = new WeakMap();
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function splitLines(el) {
if (el.children.length) return 0;
const words = el.textContent.trim().split(' '); // &nbsp; pairs stay joined
originals.set(el, el.innerHTML);
el.innerHTML = words.map((w) => `<span>${escapeHtml(w)}</span>`).join(' ');
const lines = [];
let lastTop = null;
for (const span of el.children) {
const top = span.offsetTop;
if (top !== lastTop) {
lines.push([]);
lastTop = top;
}
lines[lines.length - 1].push(span.textContent);
}
el.innerHTML = lines.map((line, i) =>
`<span class="reveal-line"><span class="reveal-line__inner" style="--line-index:${i}">${escapeHtml(line.join(' '))}</span></span>`
).join('');
return lines.length;
}
function restoreLines(el) {
if (originals.has(el)) {
el.innerHTML = originals.get(el);
originals.delete(el);
}
}
const WILL_CHANGE = {
section: 'clip-path',
contained: 'opacity, transform',
lines: 'auto',
figure: 'opacity, filter',
image: 'transform',
line: 'transform',
};
function reveal(el, kind, lineCount = 0) {
if (kind === 'lines') {
el.querySelectorAll('.reveal-line__inner').forEach((inner) => { inner.style.willChange = 'transform'; });
} else {
el.style.willChange = WILL_CHANGE[kind];
}
requestAnimationFrame(() => {
el.classList.add('is-revealed');
el.classList.remove('is-pending');
});
const duration =
kind === 'image' ? ms('--dur-image') :
kind === 'line' ? ms('--dur-line') :
kind === 'contained' ? ms('--dur-fade') :
ms('--dur-section') + lineCount * ms('--stagger-line');
setTimeout(() => {
el.style.willChange = '';
el.classList.remove('is-revealed');
if (kind === 'lines') restoreLines(el);
}, duration + 100);
}
const pending = new Map(); // element → { io, target, onEnter }
const byTarget = new Map(); // observed target → element
function settle(el) {
const item = pending.get(el);
if (!item) return;
pending.delete(el);
byTarget.delete(item.target);
item.io.unobserve(item.target);
if (item.target.dataset.revealSentinel !== undefined) item.target.remove();
item.onEnter(el);
}
function observe(elements, rootMargin, onEnter, targetOf = (el) => el) {
if (!elements.length) return;
const io = new IntersectionObserver((entries) => {
for (const entry of entries) {
if (entry.isIntersecting) settle(byTarget.get(entry.target));
}
}, { rootMargin, threshold: 0 });
elements.forEach((el) => {
const target = targetOf(el);
pending.set(el, { io, target, onEnter });
byTarget.set(target, el);
io.observe(target);
});
}
function sentinelFor(section) {
const marker = document.createElement('span');
marker.className = 'reveal-sentinel';
marker.setAttribute('aria-hidden', 'true');
marker.dataset.revealSentinel = '';
section.before(marker);
return marker;
}
function sweepSkipped() {
for (const el of pending.keys()) {
if (el.getBoundingClientRect().bottom < 0) settle(el);
}
}
let sweepQueued = false;
function onScroll() {
if (sweepQueued || !pending.size) return;
sweepQueued = true;
requestAnimationFrame(() => {
sweepQueued = false;
sweepSkipped();
});
}
export function initReveal() {
if (!('IntersectionObserver' in window)) return;
const expressive = document.body.dataset.motion === 'expressive';
const limit = window.innerHeight * FOLD;
const belowFold = (el) => el.getBoundingClientRect().top > limit;
const pick = (selector) => [...document.querySelectorAll(selector)].filter(belowFold);
if (!expressive) {
const sections = pick('[data-reveal="section"]');
sections.forEach((el) => el.classList.add('is-pending'));
observe(sections, '0px 0px -10% 0px', (el) => reveal(el, 'contained'));
startSweep();
return;
}
const sections = pick('[data-reveal="section"]');
const titles = pick('[data-reveal="lines"]');
const figures = pick('[data-reveal="figure"]');
const images = pick('[data-reveal="image"]');
const lines = pick('[data-line]');
const lineCounts = new WeakMap();
titles.forEach((el) => lineCounts.set(el, splitLines(el)));
[...sections, ...titles, ...figures, ...images, ...lines].forEach((el) => el.classList.add('is-pending'));
observe(sections, '0px 0px -10% 0px', (el) => reveal(el, 'section'), sentinelFor);
observe(titles, '0px 0px -15% 0px', (el) => reveal(el, 'lines', lineCounts.get(el)));
observe(figures, '0px 0px -15% 0px', (el) => reveal(el, 'figure'));
observe(images, '0px 0px -10% 0px', (el) => reveal(el, 'image'));
observe(lines, '0px 0px -40% 0px', (el) => reveal(el, 'line'), (el) => el.parentElement);
startSweep();
}
function startSweep() {
window.addEventListener('scroll', onScroll, { passive: true });
sweepSkipped(); // page opened on an anchor (e.g. /o-escritorio/#equipe)
}
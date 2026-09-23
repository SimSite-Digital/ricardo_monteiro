export function initTimeline() {
const root = document.querySelector('[data-timeline]');
if (!root) return;
const progress = root.querySelector('[data-timeline-progress]');
const items = [...root.querySelectorAll('[data-timeline-item]')];
const anchor = () => window.innerHeight * 0.5; // drawing point
const waiting = new Set(items.filter((item) => item.getBoundingClientRect().top > anchor()));
waiting.forEach((item) => item.classList.add('is-pending'));
let ticking = false;
let active = false;
const update = () => {
ticking = false;
const rect = root.getBoundingClientRect();
const p = Math.min(Math.max((anchor() - rect.top) / rect.height, 0), 1);
progress.style.transform = `scaleY(${p.toFixed(4)})`;
for (const item of waiting) {
if (item.getBoundingClientRect().top < anchor()) {
item.classList.add('is-reached');
item.classList.remove('is-pending');
waiting.delete(item);
}
}
};
const onScroll = () => {
const skipped = !active && waiting.size && root.getBoundingClientRect().bottom < 0;
if ((active || skipped) && !ticking) {
ticking = true;
requestAnimationFrame(update);
}
};
new IntersectionObserver(([entry]) => {
active = entry.isIntersecting;
progress.style.willChange = active ? 'transform' : '';
if (active) onScroll();
else if (entry.boundingClientRect.bottom < 0) update();
}).observe(root);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
update();
}
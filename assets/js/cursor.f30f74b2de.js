const QUERY = window.matchMedia('(pointer: fine) and (min-width: 1025px)');
const INTERACTIVE = 'a[href], button, summary, label, input, select, textarea, [role="button"]';
const EASE = 0.22; // follow factor per frame
export function initCursor() {
if (!QUERY.matches) return;
const cursor = document.createElement('div');
cursor.className = 'cursor is-hidden';
cursor.setAttribute('aria-hidden', 'true');
cursor.innerHTML = '<span class="cursor__dot"></span><span class="cursor__ring"></span><span class="cursor__line"></span>';
document.body.append(cursor);
let x = 0;
let y = 0;
let tx = 0;
let ty = 0;
let running = false;
const frame = () => {
x += (tx - x) * EASE;
y += (ty - y) * EASE;
cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) {
requestAnimationFrame(frame);
} else {
running = false;
cursor.style.willChange = '';
}
};
const onMove = (event) => {
tx = event.clientX;
ty = event.clientY;
if (cursor.classList.contains('is-hidden')) {
x = tx;
y = ty;
cursor.classList.remove('is-hidden');
}
if (!running) {
running = true;
cursor.style.willChange = 'transform';
requestAnimationFrame(frame);
}
};
let lastColor = '';
const onOver = (event) => {
const target = event.target;
const color = getComputedStyle(target).getPropertyValue('--surface-fg').trim();
if (color && color !== lastColor) {
cursor.style.setProperty('--cursor-color', color);
lastColor = color;
}
cursor.classList.toggle('is-image', Boolean(target.closest('[data-cursor="image"]')));
cursor.classList.toggle('is-link', Boolean(target.closest(INTERACTIVE)));
};
const hide = () => cursor.classList.add('is-hidden');
document.addEventListener('pointermove', onMove, { passive: true });
document.addEventListener('pointerover', onOver, { passive: true });
document.documentElement.addEventListener('pointerleave', hide);
QUERY.addEventListener('change', (e) => {
if (!e.matches) {
document.removeEventListener('pointermove', onMove);
document.removeEventListener('pointerover', onOver);
cursor.remove();
}
});
}
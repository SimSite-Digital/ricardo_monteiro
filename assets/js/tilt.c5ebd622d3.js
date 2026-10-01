const MAX_DEG = 6;
const LIFT_PX = 4;
export function initTilt() {
const cards = document.querySelectorAll('[data-tilt]');
if (!cards.length) return;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const canTilt = () => fine.matches && !reduce.matches;
const resets = [];
cards.forEach((card) => {
const body = card.querySelector('.tilt-card__body');
if (!body) return;
let raf = 0;
let target = { rx: 0, ry: 0, gx: 50, gy: 50 };
const apply = () => {
raf = 0;
body.style.transform = `perspective(900px) rotateX(${target.rx.toFixed(2)}deg) rotateY(${target.ry.toFixed(2)}deg) translateY(-${LIFT_PX}px)`;
body.style.setProperty('--tilt-x', `${target.gx.toFixed(1)}%`);
body.style.setProperty('--tilt-y', `${target.gy.toFixed(1)}%`);
};
const reset = () => {
if (raf) cancelAnimationFrame(raf);
raf = 0;
card.classList.remove('is-active', 'is-moving');
body.style.transform = '';
body.style.removeProperty('--tilt-x');
body.style.removeProperty('--tilt-y');
};
resets.push(reset);
card.addEventListener('pointerenter', () => card.classList.add('is-active'));
card.addEventListener('pointerleave', reset);
card.addEventListener('pointercancel', reset);
card.addEventListener('pointermove', (event) => {
if (!canTilt()) return;
const r = body.getBoundingClientRect();
if (!r.width || !r.height) return;
const px = (event.clientX - r.left) / r.width;
const py = (event.clientY - r.top) / r.height;
const clamp = (v) => Math.max(-1, Math.min(1, v));
target = {
ry: clamp((px - 0.5) * 2) * MAX_DEG,
rx: clamp((0.5 - py) * 2) * MAX_DEG,
gx: px * 100,
gy: py * 100,
};
card.classList.add('is-moving');
if (!raf) raf = requestAnimationFrame(apply);
}, { passive: true });
});
const onChange = () => { if (!canTilt()) resets.forEach((r) => r()); };
reduce.addEventListener('change', onChange);
fine.addEventListener('change', onChange);
}
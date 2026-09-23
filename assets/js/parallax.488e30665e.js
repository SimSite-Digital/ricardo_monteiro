const DESKTOP = window.matchMedia('(min-width: 1025px)');
export function initParallax() {
const image = document.querySelector('[data-parallax="image"]');
const title = document.querySelector('[data-parallax="title"]');
const hero = image?.closest('.hero');
if (!hero || !title) return;
const css = getComputedStyle(document.documentElement);
const titleSpeed = parseFloat(css.getPropertyValue('--parallax-title')) || 1;
const imageSpeed = parseFloat(css.getPropertyValue('--parallax-image')) || 1;
let inView = true;
let ticking = false;
let room = 0;
const measure = () => {
room = image.offsetHeight - image.parentElement.offsetHeight;
};
const update = () => {
ticking = false;
if (!DESKTOP.matches) return;
const y = window.scrollY;
const travel = hero.offsetHeight * (1 - imageSpeed);
const progress = Math.min(Math.max(y / travel, 0), 1);
image.style.transform = `translate3d(0, ${(progress * room).toFixed(2)}px, 0)`;
title.style.transform = `translate3d(0, ${(y * (1 - titleSpeed)).toFixed(2)}px, 0)`;
};
const onScroll = () => {
if (inView && !ticking) {
ticking = true;
requestAnimationFrame(update);
}
};
const enable = () => {
measure();
image.style.willChange = 'transform';
title.style.willChange = 'transform';
update();
};
const disable = () => {
image.style.transform = image.style.willChange = '';
title.style.transform = title.style.willChange = '';
};
new IntersectionObserver(([entry]) => {
inView = entry.isIntersecting;
if (!DESKTOP.matches) return;
if (inView) enable();
else {
image.style.willChange = '';
title.style.willChange = '';
}
}).observe(hero);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { if (DESKTOP.matches) { measure(); onScroll(); } }, { passive: true });
DESKTOP.addEventListener('change', (e) => (e.matches ? enable() : disable()));
if (DESKTOP.matches) enable();
}
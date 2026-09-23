const COMPACT_AFTER = 64; // px of scroll before the header compacts
const DESKTOP = window.matchMedia('(min-width: 1025px)');
function initHeader(header) {
let ticking = false;
const update = () => {
const y = window.scrollY;
header.classList.toggle('is-top', y <= 0);
header.classList.toggle('is-compact', y > COMPACT_AFTER);
ticking = false;
};
window.addEventListener('scroll', () => {
if (!ticking) {
ticking = true;
requestAnimationFrame(update);
}
}, { passive: true });
update();
}
function initDropdown(item) {
const toggle = item.querySelector('.site-nav__toggle');
const links = [...item.querySelectorAll('.submenu__link')];
const setOpen = (open) => {
item.classList.toggle('is-open', open);
toggle.setAttribute('aria-expanded', String(open));
};
toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
toggle.addEventListener('keydown', (event) => {
if (event.key === 'ArrowDown') {
event.preventDefault();
setOpen(true);
links[0]?.focus();
}
});
item.addEventListener('keydown', (event) => {
const index = links.indexOf(document.activeElement);
if (event.key === 'Escape') {
setOpen(false);
toggle.focus();
} else if (index > -1 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
event.preventDefault();
const step = event.key === 'ArrowDown' ? 1 : -1;
links[(index + step + links.length) % links.length].focus();
}
});
item.addEventListener('focusout', (event) => {
if (!item.contains(event.relatedTarget)) setOpen(false);
});
document.addEventListener('click', (event) => {
if (!item.contains(event.target)) setOpen(false);
});
}
function buildPanel() {
const nav = document.querySelector('.site-nav__list');
const cta = document.querySelector('.site-header__cta');
if (!nav) return null;
const panel = document.createElement('div');
panel.className = 'menu-panel';
panel.id = 'menu-painel';
panel.hidden = true;
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-modal', 'true');
panel.setAttribute('aria-label', 'Menu');
const inner = document.createElement('div');
inner.className = 'menu-panel__inner';
const close = document.createElement('button');
close.type = 'button';
close.className = 'menu-panel__close';
close.dataset.menuClose = '';
close.textContent = 'Fechar';
const panelNav = document.createElement('nav');
panelNav.setAttribute('aria-label', 'Principal, painel');
const list = document.createElement('ul');
list.className = 'menu-panel__list';
list.setAttribute('role', 'list');
for (const item of nav.children) {
const li = document.createElement('li');
const sub = item.querySelector('.submenu');
if (!sub) {
const link = item.querySelector('a').cloneNode(true);
link.className = 'menu-panel__link';
li.append(link);
} else {
const group = document.createElement('p');
group.className = 'label menu-panel__group';
group.textContent = item.querySelector('.site-nav__toggle').textContent.trim();
const sublist = document.createElement('ul');
sublist.className = 'menu-panel__sublist';
sublist.setAttribute('role', 'list');
for (const subItem of sub.children) {
const subLi = document.createElement('li');
if (subItem.classList.contains('submenu__item--child')) subLi.className = 'menu-panel__child';
const link = subItem.querySelector('a').cloneNode(true);
link.className = 'menu-panel__sublink';
subLi.append(link);
sublist.append(subLi);
}
li.append(group, sublist);
}
list.append(li);
}
panelNav.append(list);
inner.append(close, panelNav);
if (cta) {
const panelCta = cta.cloneNode(true);
panelCta.className = 'btn btn--primary menu-panel__cta';
inner.append(panelCta);
}
panel.append(inner);
document.querySelector('.site-header').after(panel);
return panel;
}
function initPanel(toggle, panel) {
const inner = panel.querySelector('.menu-panel__inner');
const closeButton = panel.querySelector('[data-menu-close]');
const outside = [document.querySelector('.site-header'), document.querySelector('main'), document.querySelector('.site-footer'), document.querySelector('.sticky-whatsapp')].filter(Boolean);
const focusable = () => [...inner.querySelectorAll('a[href], button:not([disabled])')];
toggle.hidden = false;
const open = () => {
panel.hidden = false;
outside.forEach((el) => { el.inert = true; });
document.documentElement.style.overflow = 'hidden';
toggle.setAttribute('aria-expanded', 'true');
requestAnimationFrame(() => panel.classList.add('is-open'));
closeButton.focus();
};
const close = () => {
panel.classList.remove('is-open');
outside.forEach((el) => { el.inert = false; });
document.documentElement.style.overflow = '';
toggle.setAttribute('aria-expanded', 'false');
const finish = () => { if (!panel.classList.contains('is-open')) panel.hidden = true; };
panel.addEventListener('transitionend', finish, { once: true });
setTimeout(finish, 600);
toggle.focus();
};
toggle.addEventListener('click', open);
closeButton.addEventListener('click', close);
panel.addEventListener('click', (event) => {
if (event.target === panel) close();
});
panel.addEventListener('keydown', (event) => {
if (event.key === 'Escape') {
close();
return;
}
if (event.key !== 'Tab') return;
const items = focusable();
const first = items[0];
const last = items[items.length - 1];
if (event.shiftKey && document.activeElement === first) {
event.preventDefault();
last.focus();
} else if (!event.shiftKey && document.activeElement === last) {
event.preventDefault();
first.focus();
}
});
inner.addEventListener('click', (event) => {
if (event.target.closest('a')) close();
});
DESKTOP.addEventListener('change', (event) => {
if (event.matches && !panel.hidden) close();
});
}
export function initMenu() {
const header = document.querySelector('[data-header]');
if (header) initHeader(header);
document.querySelectorAll('[data-submenu]').forEach(initDropdown);
const toggle = document.querySelector('.menu-toggle');
const panel = toggle && buildPanel();
if (panel) initPanel(toggle, panel);
}
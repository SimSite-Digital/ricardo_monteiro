const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WHATSAPP_DELAY = 1500; // ms: let the success message be read/announced first
export function initForm(form) {
const msg = form.dataset;
const status = form.querySelector('[data-form-status]');
const submit = form.querySelector('[data-form-submit]');
const ts = form.querySelector('[data-form-ts]');
const demo = 'demo' in form.dataset;
if (ts) ts.value = String(Math.floor(Date.now() / 1000));
const fields = {
nome: form.elements.nome,
telefone: form.elements.telefone,
email: form.elements.email,
mensagem: form.elements.mensagem,
autorizacao: form.elements.autorizacao,
};
const setError = (name, text) => {
const input = fields[name];
const out = form.querySelector(`[data-error-for="${name}"]`);
if (!input || !out) return;
out.textContent = text || '';
if (text) input.setAttribute('aria-invalid', 'true');
else input.removeAttribute('aria-invalid');
};
const validate = () => {
const errors = {};
if (!fields.nome.value.trim()) errors.nome = msg.msgNome;
if (fields.telefone.value.replace(/\D/g, '').length < 8) errors.telefone = msg.msgTelefone;
const email = fields.email.value.trim();
if (!email) errors.email = msg.msgEmail;
else if (!EMAIL.test(email)) errors.email = msg.msgEmailInvalid;
if (!fields.mensagem.value.trim()) errors.mensagem = msg.msgMensagem;
if (!fields.autorizacao.checked) errors.autorizacao = msg.msgAutorizacao;
return errors;
};
const showErrors = (errors) => {
Object.keys(fields).forEach((name) => setError(name, errors[name]));
const first = Object.keys(fields).find((name) => errors[name]);
if (first) fields[first].focus();
return Boolean(first);
};
const setStatus = (text) => {
status.textContent = text;
};
form.addEventListener('input', (event) => {
const name = event.target.name;
if (!(name in fields) || !fields[name].hasAttribute('aria-invalid')) return;
const errors = validate();
setError(name, errors[name]);
});
const busy = (on) => {
submit.disabled = on;
form.setAttribute('aria-busy', String(on));
};
const send = async () => {
setStatus('');
if (showErrors(validate())) return;
if (demo) {
setStatus(msg.msgDemo);
return;
}
busy(true);
try {
const response = await fetch(form.action, {
method: 'POST',
body: new FormData(form),
headers: { Accept: 'application/json' },
});
const data = await response.json().catch(() => ({}));
if (response.ok && data.ok) {
setStatus(msg.msgSuccess);
form.reset();
if (ts) ts.value = String(Math.floor(Date.now() / 1000));
if (data.whatsapp) {
setTimeout(() => window.location.assign(data.whatsapp), WHATSAPP_DELAY);
}
return;
}
if (data.errors) {
const texts = {};
for (const [name, code] of Object.entries(data.errors)) {
texts[name] = name === 'email' && code === 'invalid' ? msg.msgEmailInvalid : msg[`msg${name[0].toUpperCase()}${name.slice(1)}`];
}
if (showErrors(texts)) return;
}
setStatus(msg.msgSend);
} catch {
setStatus(msg.msgSend);
} finally {
busy(false);
}
};
if (demo) {
submit.addEventListener('click', send);
} else {
form.addEventListener('submit', (event) => {
event.preventDefault();
send();
});
}
}
<?php
/**
 * config.example.php — template of config.php (versioned).
 *
 * Copy to config.php on the server (same folder as contato.php) and fill in.
 * config.php holds real credentials: it is in .gitignore and must NEVER be
 * committed. .htaccess denies HTTP access to both files.
 */

return [
    // --- SMTP (authenticated) ------------------------------------------------
    // KingHost: usually smtp.<domain> — confirm in the KingHost panel.
    // Port 587 = STARTTLS (recommended) · 465 = implicit TLS.
    // Leave SMTP_HOST empty to fall back to PHP mail() (not recommended).
    'SMTP_HOST'     => '',
    'SMTP_PORT'     => 587,
    'SMTP_SECURE'   => 'tls',   // 'tls' (STARTTLS on 587) or 'ssl' (465)
    'SMTP_USER'     => '',
    'SMTP_PASS'     => '',
    'SMTP_TIMEOUT'  => 15,      // seconds

    // --- Message routing -----------------------------------------------------
    'MAIL_FROM'      => '',     // authenticated mailbox, e.g. site@<domain>
    'MAIL_FROM_NAME' => 'Site Ricardo Monteiro Advogados Associados',
    'MAIL_TO'        => '',     // office inbox that receives the messages
    'MAIL_SUBJECT'   => 'Contato pelo site',

    // --- WhatsApp redirect after a successful send ----------------------------
    // Office WhatsApp, confirmed by the client: +55 65 9 8114-4133 (same
    // number as content/site.mjs). Digits only, country and area code.
    // Empty = no redirect (the success message is shown and that is all).
    'WHATSAPP_NUMBER' => '5565981144133',
    // Pre-filled message. {nome} and {area} are replaced. Pending client
    // approval (the scope defines its content — name and area — not its words).
    'WHATSAPP_TEXT'   => 'Nome: {nome}. Área de interesse: {area}.',

    // --- Anti-abuse --------------------------------------------------------------
    'MIN_FILL_SECONDS'  => 3,     // faster than this = bot (only when JS set the timer)
    'RATE_LIMIT_MAX'    => 5,     // submissions…
    'RATE_LIMIT_WINDOW' => 3600,  // …per IP per window (seconds)
    'STORAGE_DIR'       => __DIR__ . '/storage', // rate-limit files; outside web access (see .htaccess)
];

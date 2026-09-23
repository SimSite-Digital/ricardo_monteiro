<?php
/**
 * contato.php — contact form endpoint. Single file, no framework, no Composer.
 * PHP 7.4+ (KingHost shared hosting, Apache + PHP).
 *
 * Flow
 *   1. POST only. Anti-bot: honeypot + minimum fill time (silent "success").
 *   2. Rate limit per IP (file based, flock).
 *   3. Server-side validation (mandatory, independent of the JS one).
 *   4. Sanitization; header values stripped of CR/LF (header injection).
 *   5. Authenticated SMTP via socket (STARTTLS 587 or TLS 465), written by
 *      hand; PHP mail() only when SMTP_HOST is empty.
 *   6. Response:
 *        Accept: application/json (form.js) → JSON
 *          200 { ok: true, whatsapp: "https://wa.me/…" | null }
 *          422 { ok: false, errors: { field: "required" | "invalid" } }
 *          429 / 502 { ok: false }
 *        plain POST (no JS) → 303 to contato/enviado/ or contato/erro/
 *
 * Credentials live in config.php (not versioned). See config.example.php.
 * No visible text lives here: every message shown to the visitor comes from
 * the site content (JSON errors are codes, pages are static).
 */

declare(strict_types=1);

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Practice areas (slug => name) — injected by build.mjs from content/site.mjs
const AREAS = ['direito-criminal' => 'Direito Criminal', 'tribunal-do-juri' => 'Tribunal do Júri', 'direito-administrativo' => 'Direito Administrativo', 'improbidade-administrativa' => 'Improbidade Administrativa', 'acao-civil-publica' => 'Ação Civil Pública', 'direito-civil' => 'Direito Civil', 'direito-previdenciario' => 'Direito Previdenciário'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Public base of the site (works in the domain root or in a subfolder). */
function base_url(): string
{
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return $dir . '/';
}

function wants_json(): bool
{
    return strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
}

/** Ends the request: JSON for form.js, 303 redirect for a plain POST. */
function respond(bool $ok, int $status = 200, array $payload = []): void
{
    if (wants_json()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok] + $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . base_url() . ($ok ? 'contato/enviado/' : 'contato/erro/'), true, 303);
    }
    exit;
}

/** Single-line value: trims, removes control chars (incl. CR/LF), caps length. */
function clean_line(string $value, int $max): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    return mb_substr(trim($value), 0, $max);
}

/** Multi-line value: keeps line breaks, removes other control chars. */
function clean_text(string $value, int $max): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', '', $value) ?? '';
    return mb_substr(trim($value), 0, $max);
}

/** RFC 2047 encoded header text (UTF-8, base64). */
function encode_header(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

// ---------------------------------------------------------------------------
// Rate limit (per IP, file based)
// ---------------------------------------------------------------------------
function rate_limited(array $cfg): bool
{
    $dir = $cfg['STORAGE_DIR'] . '/ratelimit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        error_log('contato.php: rate-limit storage unavailable');
        return false; // fail open: never block real visitors because of storage
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = $dir . '/' . hash('sha256', $ip) . '.json'; // IP never stored in clear
    $now = time();

    $fp = fopen($file, 'c+');
    if (!$fp) {
        return false;
    }
    flock($fp, LOCK_EX);
    $hits = json_decode((string) stream_get_contents($fp), true) ?: [];
    $hits = array_values(array_filter($hits, function ($t) use ($now, $cfg) {
        return is_int($t) && $t > $now - (int) $cfg['RATE_LIMIT_WINDOW'];
    }));
    $limited = count($hits) >= (int) $cfg['RATE_LIMIT_MAX'];
    if (!$limited) {
        $hits[] = $now;
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($hits));
    flock($fp, LOCK_UN);
    fclose($fp);
    return $limited;
}

// ---------------------------------------------------------------------------
// SMTP client (AUTH LOGIN, STARTTLS or implicit TLS)
// ---------------------------------------------------------------------------
final class Smtp
{
    /** @var resource */
    private $socket;

    public function __construct(array $cfg)
    {
        $secure = strtolower((string) $cfg['SMTP_SECURE']);
        $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $cfg['SMTP_HOST'] . ':' . (int) $cfg['SMTP_PORT'];
        $timeout = (int) $cfg['SMTP_TIMEOUT'];

        $socket = @stream_socket_client($remote, $errno, $errstr, $timeout);
        if (!$socket) {
            throw new RuntimeException("connect failed ($errno)");
        }
        stream_set_timeout($socket, $timeout);
        $this->socket = $socket;

        $this->expect(220);
        $helo = preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['SERVER_NAME'] ?? 'localhost') ?: 'localhost';
        $this->command("EHLO $helo", 250);

        if ($secure === 'tls') {
            $this->command('STARTTLS', 220);
            if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('STARTTLS failed');
            }
            $this->command("EHLO $helo", 250);
        }

        $this->command('AUTH LOGIN', 334);
        $this->command(base64_encode((string) $cfg['SMTP_USER']), 334);
        $this->command(base64_encode((string) $cfg['SMTP_PASS']), 235);
    }

    public function send(string $from, string $to, string $data): void
    {
        $this->command("MAIL FROM:<$from>", 250);
        $this->command("RCPT TO:<$to>", [250, 251]);
        $this->command('DATA', 354);
        // Dot-stuffing (RFC 5321 §4.5.2) and CRLF line endings
        // (normalize to LF first, then LF → CRLF: a single array str_replace
        // would turn an existing CRLF into CR LF LF)
        $data = str_replace(["\r\n", "\r"], "\n", $data);
        $data = str_replace("\n", "\r\n", preg_replace('/^\./m', '..', $data));
        $this->command($data . "\r\n.", 250);
        $this->command('QUIT', 221);
        fclose($this->socket);
    }

    /** @param int|int[] $expected */
    private function command(string $line, $expected): void
    {
        fwrite($this->socket, $line . "\r\n");
        $this->expect($expected);
    }

    /** Reads a (possibly multi-line) reply and checks its code. */
    private function expect($expected): void
    {
        $reply = '';
        while (($line = fgets($this->socket, 515)) !== false) {
            $reply .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        $code = (int) substr($reply, 0, 3);
        if (!in_array($code, (array) $expected, true)) {
            // Server reply logged without message content (no personal data)
            throw new RuntimeException('SMTP unexpected reply ' . $code);
        }
    }
}

/** Builds headers + body and sends through SMTP (or mail() as fallback). */
function send_mail(array $cfg, array $msg): bool
{
    $from = clean_line((string) $cfg['MAIL_FROM'], 160);
    $to = clean_line((string) $cfg['MAIL_TO'], 160);
    if (!filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        error_log('contato.php: MAIL_FROM / MAIL_TO not configured');
        return false;
    }

    $subject = encode_header(clean_line((string) $cfg['MAIL_SUBJECT'], 120) . ' — ' . $msg['nome']);
    $body = implode("\n", [
        'Nome: ' . $msg['nome'],
        'Telefone ou WhatsApp: ' . $msg['telefone'],
        'E-mail: ' . $msg['email'],
        'Área de interesse: ' . ($msg['area'] !== '' ? $msg['area'] : '—'),
        'Autorização de contato (LGPD): sim',
        '',
        'Mensagem:',
        $msg['mensagem'],
        '',
        '—',
        'Enviado em ' . date('d/m/Y H:i') . ' pelo formulário do site.',
    ]);

    // Every header value is single-line (clean_line) — no CRLF injection.
    // Reply-To is the visitor's address only after FILTER_VALIDATE_EMAIL.
    $headers = [
        'Date: ' . date('r'),
        'From: ' . encode_header(clean_line((string) $cfg['MAIL_FROM_NAME'], 120)) . " <$from>",
        "To: <$to>",
        'Reply-To: ' . encode_header($msg['nome']) . ' <' . $msg['email'] . '>',
        "Subject: $subject",
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($from, '@'), 1) . '>',
    ];
    $encodedBody = rtrim(chunk_split(base64_encode($body), 76, "\n"));

    try {
        if (trim((string) $cfg['SMTP_HOST']) === '') {
            // Fallback only: PHP mail() (headers without To/Subject/Date)
            $extra = array_filter($headers, function ($h) {
                return !preg_match('/^(To|Subject|Date):/i', $h);
            });
            return mail($to, $subject, $encodedBody, implode("\r\n", $extra), '-f' . $from);
        }
        (new Smtp($cfg))->send($from, $to, implode("\n", $headers) . "\n\n" . $encodedBody);
        return true;
    } catch (Throwable $e) {
        error_log('contato.php: ' . $e->getMessage());
        return false;
    }
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    header('Location: ' . base_url() . 'contato/', true, 303);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('contato.php: config.php missing');
    respond(false, 500);
}
$cfg = require $configFile;

// 1. Anti-bot — answer as a success, send nothing, reveal nothing
$honeypot = (string) ($_POST['website'] ?? '');
$started = (int) ($_POST['ts'] ?? 0); // 0 = no JS: timing check skipped
if ($honeypot !== '' || ($started > 0 && time() - $started < (int) $cfg['MIN_FILL_SECONDS'])) {
    respond(true, 200, ['whatsapp' => null]);
}

// 2. Rate limit
if (rate_limited($cfg)) {
    respond(false, 429);
}

// 3. Validation (server-side, always)
$msg = [
    'nome' => clean_line((string) ($_POST['nome'] ?? ''), 120),
    'telefone' => clean_line((string) ($_POST['telefone'] ?? ''), 30),
    'email' => clean_line((string) ($_POST['email'] ?? ''), 160),
    'area' => '',
    'mensagem' => clean_text((string) ($_POST['mensagem'] ?? ''), 5000),
];
$areaSlug = clean_line((string) ($_POST['area'] ?? ''), 60);
if ($areaSlug !== '' && isset(AREAS[$areaSlug])) {
    $msg['area'] = AREAS[$areaSlug];
}

$errors = [];
if ($msg['nome'] === '') {
    $errors['nome'] = 'required';
}
if ($msg['telefone'] === '' || !preg_match('/\d{8,}/', preg_replace('/\D/', '', $msg['telefone']) ?? '')) {
    $errors['telefone'] = 'required';
}
if ($msg['email'] === '') {
    $errors['email'] = 'required';
} elseif (!filter_var($msg['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'invalid';
}
if ($msg['mensagem'] === '') {
    $errors['mensagem'] = 'required';
}
if (($_POST['autorizacao'] ?? '') !== 'sim') {
    $errors['autorizacao'] = 'required';
}
if ($errors) {
    respond(false, 422, ['errors' => $errors]);
}

// 4–5. Send
if (!send_mail($cfg, $msg)) {
    respond(false, 502);
}

// 6. Success — progressive WhatsApp redirect (only when a number is configured)
$whatsapp = null;
$number = preg_replace('/\D/', '', (string) ($cfg['WHATSAPP_NUMBER'] ?? '')) ?? '';
if ($number !== '') {
    $text = strtr((string) $cfg['WHATSAPP_TEXT'], [
        '{nome}' => $msg['nome'],
        '{area}' => $msg['area'] !== '' ? $msg['area'] : '—',
    ]);
    $whatsapp = 'https://wa.me/' . $number . '?text=' . rawurlencode($text);
}
respond(true, 200, ['whatsapp' => $whatsapp]);

const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

const senderAddress = process.env.EMAIL_SENDER || 'contact@julia-tooker.com';
const senderName = process.env.EMAIL_SENDER_NAME || 'Julia Perez Tooker';
// BCC'd on every outgoing email if set, so the site owner gets a copy.
// Off by default - set NOTIFY_EMAIL in the Function App's own settings
// (never in source) to turn it on.
const notifyEmail = process.env.NOTIFY_EMAIL || '';

// The marketing site (julia-tooker.com) and this API (a standalone Azure
// Function App) live on different origins, so browsers require this API
// to answer CORS preflights and echo back an allowed origin.
const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || 'https://julia-tooker.com,https://www.julia-tooker.com')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
);

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function getTableClient(tableName) {
  const accountName = process.env.STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error('Storage configuration is missing.');
  }

  return new TableClient(
    `https://${accountName}.table.core.windows.net`,
    tableName,
    new AzureNamedKeyCredential(accountName, accountKey),
  );
}

async function sendEmail({ recipient, subject, textBody, htmlBody, replyTo }) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  if (!apiKey) throw new Error('SMTP2GO API key is not configured.');

  const response = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      sender: `${senderName} <${senderAddress}>`,
      to: [recipient],
      ...(notifyEmail ? { bcc: [notifyEmail] } : {}),
      ...(replyTo ? { custom_headers: [{ header: 'Reply-To', value: replyTo }] } : {}),
      subject,
      text_body: textBody,
      html_body: htmlBody,
    }),
  });

  if (!response.ok) {
    throw new Error(`SMTP2GO returned HTTP ${response.status}.`);
  }
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

// A minimal fixed-window rate limit backed by Table Storage: at most
// maxRequests per IP per windowMs, tracked as one row per (purpose, ip).
// Not perfectly atomic under heavy concurrency, but that's an acceptable
// tradeoff for discouraging casual abuse of a public, unauthenticated
// endpoint without standing up a separate rate-limiting service.
async function checkRateLimit(table, purpose, ip, { maxRequests, windowMs }) {
  const partitionKey = `rate-limit-${purpose}`;
  const rowKey = encodeURIComponent(ip);
  const now = Date.now();

  let entity;
  try {
    entity = await table.getEntity(partitionKey, rowKey);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  if (!entity || now - entity.windowStart > windowMs) {
    await table.upsertEntity({ partitionKey, rowKey, windowStart: now, count: 1 }, 'Replace');
    return true;
  }

  if (entity.count >= maxRequests) {
    return false;
  }

  await table.updateEntity({ partitionKey, rowKey, count: entity.count + 1 }, 'Merge');
  return true;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

module.exports = {
  corsHeaders,
  getTableClient,
  sendEmail,
  getClientIp,
  checkRateLimit,
  escapeHtml,
};

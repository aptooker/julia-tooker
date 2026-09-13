// Email templates sent by the signup function.
// Keep markup email-client-safe: table layout, inline styles, web-safe font fallbacks.

// Bump this whenever images/email-hero-banner.jpg changes. Gmail (and other
// clients) proxy and cache remote images by URL, so reusing the same URL
// after swapping the file can keep showing the old cached copy - a version
// query string forces those caches to treat it as a new resource.
const BANNER_VERSION = '2';

function buildWelcomeEmail({ siteUrl, unsubscribeUrl }) {
  const subject = "You're on Julia Perez Tooker's list!";

  const textBody = `Thank you for joining Julia Perez Tooker's event list!

You'll be the first to hear about upcoming performances, concerts, and special engagements, including opera, musical theatre, and cabaret.

See what's coming up: ${siteUrl}/#performances

Follow along:
Instagram: https://www.instagram.com/julia.tooker/
YouTube: https://www.youtube.com/@juliatookersoprano
Facebook: https://www.facebook.com/julia.tooker.5
TikTok: https://www.tiktok.com/@juliayuuh

Questions? Just reply to this email or write to contact@julia-tooker.com.

Julia Perez Tooker
Rochester, NY

Unsubscribe: ${unsubscribeUrl}`;

  const htmlBody = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background:#0e0e0e;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      Thank you for joining, here's what to expect from Julia's list.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;">
      <tr>
        <td align="center" style="padding: 16px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#1a1a1a; border:1px solid rgba(201,168,76,0.25);">

            <!-- Header -->
            <tr>
              <td align="center" style="padding: 16px 24px 8px;">
                <p style="margin:0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#c9a84c;">
                  Crossover Soprano
                </p>
                <h1 style="margin:0; font-family: Georgia, 'Times New Roman', serif; font-weight:400; font-size:22px; color:#f5f0e8;">
                  Julia Perez Tooker
                </h1>
              </td>
            </tr>

            <!-- Photo -->
            <tr>
              <td>
                <img src="${siteUrl}/images/email-hero-banner.jpg?v=${BANNER_VERSION}" alt="Julia Perez Tooker" width="600" height="180" style="display:block; width:100%; max-width:600px; height:auto;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 16px 28px 4px;">
                <h2 style="margin:0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-weight:400; font-size:18px; color:#c9a84c;">
                  You're on the list!
                </h2>
                <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size:14px; line-height:1.45; color:#f5f0e8;">
                  Thank you for signing up. You'll be the first to hear about Julia's upcoming performances, concerts, and special engagements.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding: 12px 28px 16px;">
                <a href="${siteUrl}/#performances" style="display:inline-block; padding:10px 28px; background:#c9a84c; color:#0e0e0e; font-family: Arial, Helvetica, sans-serif; font-size:13px; font-weight:bold; text-decoration:none; letter-spacing:0.5px;">
                  View Upcoming Performances
                </a>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:0 28px;">
                <hr style="border:none; border-top:1px solid rgba(201,168,76,0.25); margin:0;">
              </td>
            </tr>

            <!-- Social -->
            <tr>
              <td align="center" style="padding: 12px 28px;">
                <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#888888;">
                  <a href="https://www.instagram.com/julia.tooker/" style="color:#c9a84c; text-decoration:none;">Instagram</a>
                  &nbsp;&bull;&nbsp;
                  <a href="https://www.youtube.com/@juliatookersoprano" style="color:#c9a84c; text-decoration:none;">YouTube</a>
                  &nbsp;&bull;&nbsp;
                  <a href="https://www.facebook.com/julia.tooker.5" style="color:#c9a84c; text-decoration:none;">Facebook</a>
                  &nbsp;&bull;&nbsp;
                  <a href="https://www.tiktok.com/@juliayuuh" style="color:#c9a84c; text-decoration:none;">TikTok</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 8px 28px 16px; border-top:1px solid rgba(201,168,76,0.1);">
                <p style="margin:12px 0 2px; font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#888888;">
                  Questions? Reply to this email or write to
                  <a href="mailto:contact@julia-tooker.com" style="color:#888888;">contact@julia-tooker.com</a>.
                </p>
                <p style="margin:2px 0; font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#888888;">
                  Julia Perez Tooker &nbsp;&middot;&nbsp; Rochester, NY
                  &nbsp;&middot;&nbsp;
                  <a href="${unsubscribeUrl}" style="color:#888888;">Unsubscribe</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, textBody, htmlBody };
}

// A small branded landing page for the unsubscribe link - this is a normal
// browser page (not an email), so real fonts/CSS are fair game here.
function buildUnsubscribePage({ siteUrl, heading, message }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${heading} — Julia Perez Tooker</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&family=Raleway:wght@300;400&display=swap" rel="stylesheet">
    <style>
      :root { --gold: #c9a84c; --dark: #0e0e0e; --cream: #f5f0e8; --text-muted: #999; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: var(--dark);
        color: var(--cream);
        font-family: 'Raleway', sans-serif;
        font-weight: 300;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        max-width: 480px;
        width: 100%;
        text-align: center;
        padding: 48px 36px;
        border: 1px solid rgba(201,168,76,0.25);
        background: rgba(255,255,255,0.02);
      }
      .label {
        font-size: 0.7rem;
        letter-spacing: 4px;
        text-transform: uppercase;
        color: var(--gold);
        margin-bottom: 16px;
      }
      h1 {
        font-family: 'Cormorant Garamond', serif;
        font-weight: 400;
        font-size: 2.2rem;
        margin-bottom: 20px;
      }
      p {
        font-size: 1rem;
        line-height: 1.7;
        color: var(--text-muted);
        margin-bottom: 32px;
      }
      a.btn {
        display: inline-block;
        padding: 14px 36px;
        background: var(--gold);
        color: var(--dark);
        font-size: 0.75rem;
        font-weight: 500;
        letter-spacing: 3px;
        text-transform: uppercase;
        text-decoration: none;
        transition: background 0.3s;
      }
      a.btn:hover { background: #e8c97a; }
    </style>
  </head>
  <body>
    <div class="card">
      <p class="label">Julia Perez Tooker</p>
      <h1>${heading}</h1>
      <p>${message}</p>
      <a class="btn" href="${siteUrl}">Back to the site</a>
    </div>
  </body>
</html>`;
}

module.exports = { buildWelcomeEmail, buildUnsubscribePage };

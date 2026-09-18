const { app } = require('@azure/functions');
const crypto = require('crypto');
const { buildWelcomeEmail, buildUnsubscribePage } = require('../emailTemplates');
const { corsHeaders, getTableClient, sendEmail, getClientIp, checkRateLimit } = require('../lib/shared');

const tableName = process.env.SIGNUPS_TABLE_NAME || 'eventSignups';
const siteUrl = process.env.SITE_URL || 'https://julia-tooker.com';
// The marketing site (julia-tooker.com) is static and has no /api routes -
// unsubscribe links must point at this Function App's own host, not the site.
const apiBaseUrl = process.env.API_BASE_URL || 'https://julia-tooker-signup-api-2d1a71.azurewebsites.net';

app.http('signup', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'signup',
  handler: async (request, context) => {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') {
      return { status: 204, headers };
    }

    try {
      const body = await request.json();

      // Honeypot: a hidden field real visitors never fill in. Bots that
      // blindly fill every input trip it - respond with the normal
      // success message but skip all real work, so they don't learn
      // they were caught.
      if (typeof body.company === 'string' && body.company.trim() !== '') {
        return { status: 201, headers, jsonBody: { message: 'You are on the list. Thank you!' } };
      }

      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { status: 400, headers, jsonBody: { message: 'Please enter a valid email address.' } };
      }

      const table = getTableClient(tableName);
      await table.createTable().catch(error => {
        if (error.statusCode !== 409) throw error;
      });

      const ip = getClientIp(request);
      const withinLimit = await checkRateLimit(table, 'signup', ip, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
      if (!withinLimit) {
        return { status: 429, headers, jsonBody: { message: 'Too many signups from this connection. Please try again later.' } };
      }

      const rowKey = encodeURIComponent(email);
      const unsubscribeToken = crypto.randomUUID();
      let alreadyActive = false;

      try {
        await table.createEntity({
          partitionKey: 'event-news',
          rowKey,
          email,
          signedUpAt: new Date().toISOString(),
          unsubscribed: false,
          unsubscribeToken,
        });
      } catch (error) {
        if (error.statusCode !== 409) throw error;

        // Row already exists - this email signed up before. If they had
        // unsubscribed, re-activate them with a fresh token instead of
        // silently treating this as a no-op "already on the list".
        const existing = await table.getEntity('event-news', rowKey);
        if (!existing.unsubscribed) {
          alreadyActive = true;
        } else {
          await table.updateEntity({
            partitionKey: 'event-news',
            rowKey,
            unsubscribed: false,
            unsubscribeToken,
            resubscribedAt: new Date().toISOString(),
          }, 'Merge');
        }
      }

      if (alreadyActive) {
        return { status: 200, headers, jsonBody: { message: 'You are already on the list.' } };
      }

      const unsubscribeUrl = `${apiBaseUrl}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      try {
        const { subject, textBody, htmlBody } = buildWelcomeEmail({ siteUrl, unsubscribeUrl });
        await sendEmail({ recipient: email, subject, textBody, htmlBody });
      } catch (error) {
        context.error('Welcome email failed after signup was saved.', error);
      }

      return { status: 201, headers, jsonBody: { message: 'You are on the list. Thank you!' } };
    } catch (error) {
      context.error('Signup failed', error);
      return { status: 500, headers, jsonBody: { message: 'The signup service is temporarily unavailable.' } };
    }
  },
});

app.http('unsubscribe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'unsubscribe',
  handler: async (request, context) => {
    const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8' };
    const page = (status, heading, message) => ({
      status,
      headers: htmlHeaders,
      body: buildUnsubscribePage({ siteUrl, heading, message }),
    });

    const token = request.query.get('token');
    if (!token) return page(400, 'Invalid Link', 'This unsubscribe link is missing its token, so we could not process it.');

    try {
      const table = getTableClient(tableName);
      const entities = table.listEntities({ queryOptions: { filter: `PartitionKey eq 'event-news' and unsubscribeToken eq '${token.replace(/'/g, "''")}'` } });
      for await (const entity of entities) {
        await table.updateEntity({
          partitionKey: entity.partitionKey,
          rowKey: entity.rowKey,
          unsubscribed: true,
          unsubscribedAt: new Date().toISOString(),
        }, 'Merge');
        return page(200, "You're Unsubscribed", "You won't receive any further event emails from Julia Perez Tooker. Sorry to see you go!");
      }

      return page(404, 'Link No Longer Valid', 'This unsubscribe link has already been used or has expired.');
    } catch (error) {
      context.error('Unsubscribe failed', error);
      return page(500, 'Something Went Wrong', 'We could not process your unsubscribe request. Please try again later or email us directly.');
    }
  },
});

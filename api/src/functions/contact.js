const { app } = require('@azure/functions');
const { buildContactNotificationEmail } = require('../emailTemplates');
const { corsHeaders, getTableClient, sendEmail, getClientIp, checkRateLimit } = require('../lib/shared');

const tableName = process.env.SIGNUPS_TABLE_NAME || 'eventSignups';
// Where visitor messages actually land - the business's own public address,
// not a personal one, kept out of the page's HTML by living here instead.
const contactRecipient = process.env.CONTACT_RECIPIENT || 'contact@julia-tooker.com';
const MAX_NAME_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

app.http('contact', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'contact',
  handler: async (request, context) => {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') {
      return { status: 204, headers };
    }

    try {
      const body = await request.json();

      // Honeypot - see signup.js for why this fakes success instead of
      // rejecting outright.
      if (typeof body.company === 'string' && body.company.trim() !== '') {
        return { status: 201, headers, jsonBody: { message: 'Thank you! Your message has been sent.' } };
      }

      const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LENGTH) : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : '';

      if (!name) {
        return { status: 400, headers, jsonBody: { message: 'Please enter your name.' } };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { status: 400, headers, jsonBody: { message: 'Please enter a valid email address.' } };
      }
      if (!message) {
        return { status: 400, headers, jsonBody: { message: 'Please enter a message.' } };
      }

      const table = getTableClient(tableName);
      await table.createTable().catch(error => {
        if (error.statusCode !== 409) throw error;
      });

      const ip = getClientIp(request);
      const withinLimit = await checkRateLimit(table, 'contact', ip, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
      if (!withinLimit) {
        return { status: 429, headers, jsonBody: { message: 'Too many messages from this connection. Please try again later.' } };
      }

      const { subject, textBody, htmlBody } = buildContactNotificationEmail({ name, email, message });
      await sendEmail({ recipient: contactRecipient, subject, textBody, htmlBody, replyTo: email });

      return { status: 201, headers, jsonBody: { message: 'Thank you! Your message has been sent.' } };
    } catch (error) {
      context.error('Contact form submission failed', error);
      return { status: 500, headers, jsonBody: { message: 'The contact form is temporarily unavailable. Please try again later.' } };
    }
  },
});

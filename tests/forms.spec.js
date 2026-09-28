const { test, expect } = require('@playwright/test');

// The signup/contact forms POST to a live Azure Function
// (julia-tooker-signup-api). Tests intercept those calls instead of
// hitting the real API - we're verifying the page's own behavior
// (validation, status messages, resets), not the backend, and a real
// call would send actual emails and burn the API's rate limit.
const API_HOST = 'julia-tooker-signup-api-2d1a71.azurewebsites.net';

test.describe('contact form', () => {
  test('submits and shows the success message', async ({ page }) => {
    await page.route(`https://${API_HOST}/api/contact`, (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Thank you! Your message has been sent.' }),
      })
    );

    await page.goto('/');
    await page.locator('#contactName').fill('Test User');
    await page.locator('#contactFormEmail').fill('test@example.com');
    await page.locator('#contactMessage').fill('Hello, this is a test inquiry.');
    await page.locator('#contactForm button[type="submit"]').click();

    await expect(page.locator('#contactForm .signup-status')).toHaveText(
      'Thank you! Your message has been sent.'
    );
  });

  test('shows the server-provided message on failure', async ({ page }) => {
    await page.route(`https://${API_HOST}/api/contact`, (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Too many messages from this connection. Please try again later.' }),
      })
    );

    await page.goto('/');
    await page.locator('#contactName').fill('Test User');
    await page.locator('#contactFormEmail').fill('test@example.com');
    await page.locator('#contactMessage').fill('Hello again.');
    await page.locator('#contactForm button[type="submit"]').click();

    await expect(page.locator('#contactForm .signup-status')).toHaveText(
      'Too many messages from this connection. Please try again later.'
    );
  });

  test('the honeypot field is empty and positioned off-screen', async ({ page }) => {
    await page.goto('/');
    const honeypot = page.locator('#contactForm input[name="company"]');
    await expect(honeypot).toHaveValue('');
    // It's parked far off-screen (.hp-field) rather than display:none, so
    // simple bots that skip display:none fields still see and fill it in.
    // Playwright's toBeVisible() doesn't consider off-screen positioning,
    // so check the actual box position instead.
    const box = await honeypot.boundingBox();
    expect(box.x).toBeLessThan(0);
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  test('blocks submission when the email field is invalid', async ({ page }) => {
    let requestMade = false;
    await page.route(`https://${API_HOST}/api/contact`, (route) => {
      requestMade = true;
      route.continue();
    });

    await page.goto('/');
    await page.locator('#contactName').fill('Test User');
    await page.locator('#contactFormEmail').fill('not-an-email');
    await page.locator('#contactMessage').fill('Hello.');
    await page.locator('#contactForm button[type="submit"]').click();

    // HTML5 validation should block the submit before our fetch fires.
    await page.waitForTimeout(300);
    expect(requestMade).toBe(false);
  });
});

test.describe('event signup form', () => {
  test('submits and shows the success message', async ({ page }) => {
    await page.route(`https://${API_HOST}/api/signup`, (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'You are on the list. Thank you!' }),
      })
    );

    await page.goto('/');
    await page.locator('#contactSignupEmail').fill('subscriber@example.com');
    await page.locator('.signup-form button[type="submit"]').click();

    await expect(page.locator('.signup-form .signup-status')).toHaveText(
      'You are on the list. Thank you!'
    );
  });

  test('resets the field after a successful signup', async ({ page }) => {
    await page.route(`https://${API_HOST}/api/signup`, (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'You are on the list. Thank you!' }),
      })
    );

    await page.goto('/');
    const emailField = page.locator('#contactSignupEmail');
    await emailField.fill('subscriber@example.com');
    await page.locator('.signup-form button[type="submit"]').click();

    await expect(page.locator('.signup-form .signup-status')).toHaveText(/thank you/i);
    await expect(emailField).toHaveValue('');
  });
});

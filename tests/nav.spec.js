const { test, expect } = require('@playwright/test');

// Each nav link should scroll its target section flush under the fixed
// nav and move keyboard focus there - see index.html's custom anchor
// click handler (this bypasses the browser's native #hash jump, which
// iOS Safari was found to miscalculate for these fixed-nav offsets).
const SECTIONS = ['about', 'gallery', 'repertoire', 'performances', 'contact'];

test.describe('desktop nav links', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const id of SECTIONS) {
    test(`"${id}" link scrolls to and focuses #${id}`, async ({ page }) => {
      await page.goto('/');
      // Wait for the same conditions the page's own scroll-spacer
      // calculation waits for (every image loaded, fonts settled)
      // before clicking - a fixed timeout here was flaky in CI, since
      // exactly how long that takes varies with agent/machine speed.
      await page.waitForFunction(() =>
        document.fonts.status === 'loaded' && Array.from(document.images).every((img) => img.complete)
      );
      // A little extra headroom for the page's own double-rAF settle
      // pass after those conditions are met.
      await page.waitForTimeout(300);
      await page.locator(`a[href="#${id}"]`).first().click();

      // Smooth-scroll needs a moment to finish before positions settle
      // (more headroom than a fast local run needs, to stay reliable
      // on slower CI agents).
      await page.waitForTimeout(1200);

      const nav = page.locator('nav');
      const navHeight = await nav.evaluate((el) => el.offsetHeight);
      const sectionTop = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);

      // Section should sit just under the fixed nav (nav height + ~12px
      // buffer), not hidden behind it and not scrolled past.
      expect(sectionTop).toBeGreaterThanOrEqual(0);
      expect(sectionTop).toBeLessThan(navHeight + 40);

      await expect(page.locator(`#${id}`)).toBeFocused();
    });
  }
});

test.describe('mobile hamburger menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens, exposes aria-expanded, and closes on link click', async ({ page }) => {
    await page.goto('/');
    const hamburger = page.locator('#hamburger');
    const navLinks = page.locator('#navLinks');

    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(navLinks).not.toHaveClass(/open/);

    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    await expect(navLinks).toHaveClass(/open/);

    await page.locator('#navLinks a[href="#gallery"]').click();
    await expect(navLinks).not.toHaveClass(/open/);
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes the open menu', async ({ page }) => {
    await page.goto('/');
    await page.locator('#hamburger').click();
    await expect(page.locator('#navLinks')).toHaveClass(/open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#navLinks')).not.toHaveClass(/open/);
  });

  test('background is inert while the menu is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('#hamburger').click();
    await expect(page.locator('main')).toHaveJSProperty('inert', true);

    await page.locator('#hamburger').click();
    await expect(page.locator('main')).toHaveJSProperty('inert', false);
  });
});

test('skip link moves focus to main content when activated', async ({ page }) => {
  await page.goto('/');
  // Activate directly rather than via Tab: WebKit doesn't include plain
  // links in the Tab order by default (matches real desktop Safari
  // unless "Full Keyboard Access" is on), so a Tab-then-Enter sequence
  // isn't portable across browsers. This still verifies what matters -
  // the skip link's own behavior once it has focus.
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mainContent')).toBeFocused();
});

test('Tab reaches the skip link first', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit excludes plain links from the Tab order by default.');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});

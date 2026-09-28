const { test, expect } = require('@playwright/test');

// The carousel auto-scrolls continuously, which fails Playwright's
// actionability check ("element is not stable") for a plain .click().
// { force: true } skips that check - the click still works, a real
// user can click a moving element too, we're just testing that the
// resulting behavior (lightbox opens) is correct.
test.describe('gallery lightbox', () => {
  test('opens via keyboard (Enter) and shows the right image', async ({ page }) => {
    await page.goto('/');
    // The gallery duplicates its slides (aria-hidden) for a seamless
    // scroll loop - exclude those so we always land on a real one.
    const firstSlide = page.locator('.gallery-slide:not([aria-hidden])').first();

    await firstSlide.focus();
    await page.keyboard.press('Enter');

    const lightbox = page.locator('#lightbox');
    await expect(lightbox).toHaveClass(/active/);

    const expectedSrc = await firstSlide.locator('img').getAttribute('src');
    await expect(page.locator('#lightbox-img')).toHaveAttribute('src', expectedSrc);
  });

  test('moves focus to the close button on open, and back to the trigger on close', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.gallery-slide:not([aria-hidden])').first();
    // Activate via keyboard rather than a mouse click: WebKit/Safari
    // doesn't give a button focus on mouse click by default (only
    // Chromium/Firefox do), so document.activeElement right after a
    // forced click wouldn't reliably be the trigger there. Keyboard
    // activation focuses it consistently in every engine, which is
    // what this test actually needs to verify the return-focus logic.
    await trigger.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.lightbox-close')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#lightbox')).not.toHaveClass(/active/);
    await expect(trigger).toBeFocused();
  });

  test('traps Tab within the lightbox while open', async ({ page }) => {
    await page.goto('/');
    await page.locator('.gallery-slide:not([aria-hidden])').first().click({ force: true });
    await expect(page.locator('.lightbox-close')).toBeFocused();

    // Shift+Tab from the first control should wrap to the last one.
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.lightbox-next')).toBeFocused();
  });

  test('prev/next arrows cycle through images', async ({ page }) => {
    await page.goto('/');
    await page.locator('.gallery-slide:not([aria-hidden])').first().click({ force: true });

    const firstSrc = await page.locator('#lightbox-img').getAttribute('src');
    await page.locator('.lightbox-next').click();
    const secondSrc = await page.locator('#lightbox-img').getAttribute('src');
    expect(secondSrc).not.toBe(firstSrc);

    await page.locator('.lightbox-prev').click();
    const backToFirst = await page.locator('#lightbox-img').getAttribute('src');
    expect(backToFirst).toBe(firstSrc);
  });

  test('background is inert while the lightbox is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('.gallery-slide:not([aria-hidden])').first().click({ force: true });
    await expect(page.locator('main')).toHaveJSProperty('inert', true);

    await page.keyboard.press('Escape');
    await expect(page.locator('main')).toHaveJSProperty('inert', false);
  });

  test('the pause/play toggle stops and resumes the carousel animation', async ({ page }) => {
    await page.goto('/');
    const track = page.locator('#galleryTrack');
    const toggle = page.locator('#galleryPauseToggle');

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(track).toHaveClass(/paused/);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(track).not.toHaveClass(/paused/);
  });
});

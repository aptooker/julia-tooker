const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    // Emulating prefers-reduced-motion here was tried as a way to stop
    // the auto-scrolling gallery from destabilizing clicks, but it
    // turned out to also throw off an unrelated on-page height
    // calculation (the Contact-reachability scroll spacer) in a way
    // real reduced-motion users never see - a Chromium/Playwright
    // emulation quirk, not a site bug. Individual tests use
    // { force: true } on gallery clicks instead.
  },

  // Serves the static site with a plain HTTP server for the duration of
  // the test run - no build step, since index.html is already static.
  webServer: {
    command: 'npx http-server . -p 4173 -s',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});

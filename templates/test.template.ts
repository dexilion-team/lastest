import { Page } from '@playwright/test';

/**
 * Template for generated Playwright tests
 * This file serves as a reference for AI-generated test structure
 */

export async function test(page: Page, baseUrl: string, screenshotPath: string) {
  // Navigate to the page
  const url = baseUrl + '{{ROUTE_PATH}}';
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('domcontentloaded');

  // Optional: Wait for specific elements
  // await page.waitForSelector('{{SELECTOR}}');

  // Optional: Perform interactions
  // await page.click('{{BUTTON_SELECTOR}}');
  // await page.fill('{{INPUT_SELECTOR}}', '{{VALUE}}');

  // Take screenshot
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  // Optional: Basic assertions
  const title = await page.title();
  console.log('Page title:', title);

  // Optional: Check for console errors
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  if (errors.length > 0) {
    console.warn('Console errors detected:', errors);
  }

  return screenshotPath;
}

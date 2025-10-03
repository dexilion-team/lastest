import * as fs from 'fs-extra';
import * as path from 'path';
import { chromium, Browser, Page } from 'playwright';
import { Config, TestCase, TestResult } from './types';
import { Logger } from './utils/logger';

export class TestRunner {
  private browser: Browser | null = null;

  constructor(private config: Config) {}

  async runTests(tests: TestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Launch browser
    this.browser = await chromium.launch({ headless: true });

    try {
      // Run tests for live environment
      Logger.dim('  Testing live environment...');
      const liveResults = await this.runTestsForEnvironment(tests, 'live', this.config.liveUrl);
      results.push(...liveResults);

      // Run tests for dev environment
      Logger.dim('  Testing dev environment...');
      const devResults = await this.runTestsForEnvironment(tests, 'dev', this.config.devUrl);
      results.push(...devResults);
    } finally {
      await this.browser?.close();
    }

    return results;
  }

  private async runTestsForEnvironment(
    tests: TestCase[],
    environment: 'live' | 'dev',
    baseUrl: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const screenshotsDir = path.join(this.config.outputDir, 'screenshots', environment);
    await fs.ensureDir(screenshotsDir);

    if (this.config.parallel && this.config.maxConcurrency) {
      // Run tests in parallel with concurrency limit
      const chunks = this.chunkArray(tests, this.config.maxConcurrency);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((test) => this.runSingleTest(test, environment, baseUrl, screenshotsDir))
        );
        results.push(...chunkResults);
      }
    } else {
      // Run tests sequentially
      for (const test of tests) {
        const result = await this.runSingleTest(test, environment, baseUrl, screenshotsDir);
        results.push(result);
      }
    }

    return results;
  }

  private async runSingleTest(
    test: TestCase,
    environment: 'live' | 'dev',
    baseUrl: string,
    screenshotsDir: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const screenshotPath = path.join(screenshotsDir, `${test.name}.png`);

    try {
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const context = await this.browser.newContext({
        viewport: this.config.viewport || { width: 1920, height: 1080 },
      });

      const page = await context.newPage();

      // Run the generated test
      try {
        await this.executeTest(page, test, baseUrl, screenshotPath);

        await context.close();

        const duration = Date.now() - startTime;

        return {
          route: test.route,
          url: baseUrl + test.route,
          environment,
          passed: true,
          screenshot: screenshotPath,
          duration,
        };
      } catch (error) {
        await context.close();

        const duration = Date.now() - startTime;

        return {
          route: test.route,
          url: baseUrl + test.route,
          environment,
          passed: false,
          screenshot: screenshotPath,
          duration,
          error: (error as Error).message,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        route: test.route,
        url: baseUrl + test.route,
        environment,
        passed: false,
        screenshot: screenshotPath,
        duration,
        error: (error as Error).message,
      };
    }
  }

  private async executeTest(
    page: Page,
    test: TestCase,
    baseUrl: string,
    screenshotPath: string
  ): Promise<void> {
    // Load and execute the generated test code
    // This is a simplified version - in production, you might want to use a more robust approach

    try {
      // Navigate to the page
      const url = baseUrl + test.route;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for page to be fully loaded
      await page.waitForLoadState('domcontentloaded');

      // Take screenshot
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
    } catch (error) {
      // Try to take a screenshot even on error
      try {
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });
      } catch {
        // Ignore screenshot errors
      }

      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

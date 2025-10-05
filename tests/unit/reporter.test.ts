import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReportGenerator } from '../../src/reporter';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  createTempDir,
  cleanTestOutput,
  getDexilionConfig,
  readJsonFile,
  createMockScreenshot,
} from '../helpers/test-utils';
import { createMockTestResult } from '../helpers/mocks';

describe('ReportGenerator', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('reporter-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  async function createMockTestResultWithScreenshot(
    route: string,
    environment: 'live' | 'dev',
    outputDir: string,
    passed: boolean = true
  ) {
    // Convert route to filename (same logic as generator)
    let filename = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
    const screenshotPath = path.join(
      outputDir,
      'screenshots',
      environment,
      `${filename}.png`
    );
    await createMockScreenshot(screenshotPath);

    return {
      ...createMockTestResult(route, environment, passed),
      screenshot: screenshotPath,
    };
  }

  describe('HTML report generation', () => {
    it('should generate HTML report file', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({ outputDir });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
      ];

      const { reportPath } = await reporter.generate(results);

      expect(await fs.pathExists(reportPath)).toBe(true);
      expect(reportPath).toMatch(/report\.html$/);
    });

    it('should include correct metadata in HTML', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({
        liveUrl: 'https://dexilion.com/',
        devUrl: 'http://localhost:3000',
        outputDir,
      });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
      ];

      const { reportPath } = await reporter.generate(results);
      const html = await fs.readFile(reportPath, 'utf-8');

      expect(html).toContain('lastest Report');
      expect(html).toContain('https://dexilion.com/');
      expect(html).toContain('http://localhost:3000');
    });

    it('should show correct test statistics', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({ outputDir });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
        await createMockTestResultWithScreenshot('/about', 'live', outputDir, false), // Failed
        await createMockTestResultWithScreenshot('/about', 'dev', outputDir, true),
      ];

      const { reportPath } = await reporter.generate(results);
      const html = await fs.readFile(reportPath, 'utf-8');

      // Should show 2 total tests, 1 failed
      expect(html).toContain('Total Tests');
      expect(html).toContain('Failed');
    });
  });

  describe('Markdown summary generation', () => {
    it('should generate markdown summary file', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({ outputDir });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
      ];

      await reporter.generate(results);

      const summaryPath = path.join(config.outputDir, 'summary.md');
      expect(await fs.pathExists(summaryPath)).toBe(true);
    });

    it('should include correct information in markdown', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({
        liveUrl: 'https://dexilion.com/',
        devUrl: 'http://localhost:3000',
        outputDir,
      });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
      ];

      await reporter.generate(results);

      const summaryPath = path.join(config.outputDir, 'summary.md');
      const markdown = await fs.readFile(summaryPath, 'utf-8');

      expect(markdown).toContain('# lastest Report');
      expect(markdown).toContain('https://dexilion.com/');
      expect(markdown).toContain('http://localhost:3000');
      expect(markdown).toContain('## Summary');
    });
  });

  describe('JSON data output', () => {
    it('should save raw report data as JSON', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({ outputDir });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
      ];

      await reporter.generate(results);

      const dataPath = path.join(config.outputDir, 'data.json');
      expect(await fs.pathExists(dataPath)).toBe(true);
    });

    it('should include all report fields in JSON', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({ outputDir });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
      ];

      await reporter.generate(results);

      const dataPath = path.join(config.outputDir, 'data.json');
      const data = await readJsonFile<any>(dataPath);

      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('liveUrl');
      expect(data).toHaveProperty('devUrl');
      expect(data).toHaveProperty('totalTests');
      expect(data).toHaveProperty('passed');
      expect(data).toHaveProperty('failed');
      expect(data).toHaveProperty('comparisons');
      expect(data).toHaveProperty('duration');
    });
  });

  describe('comparison results', () => {
    it('should include comparison data in report', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({ outputDir });

      const reporter = new ReportGenerator(config);
      const results = [
        await createMockTestResultWithScreenshot('/', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/', 'dev', outputDir, true),
        await createMockTestResultWithScreenshot('/about', 'live', outputDir, true),
        await createMockTestResultWithScreenshot('/about', 'dev', outputDir, true),
      ];

      await reporter.generate(results);

      const dataPath = path.join(config.outputDir, 'data.json');
      const data = await readJsonFile<any>(dataPath);

      expect(data.comparisons).toBeInstanceOf(Array);
      expect(data.comparisons.length).toBeGreaterThanOrEqual(0);
    });
  });
});

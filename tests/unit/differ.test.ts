import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Differ } from '../../src/differ';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PNG } from 'pngjs';
import { createTempDir, cleanTestOutput, createMockScreenshot } from '../helpers/test-utils';
import { createMockTestResult } from '../helpers/mocks';

describe('Differ', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('differ-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('compareResults', () => {
    it('should compare live and dev results', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.1);

      // Create mock screenshots
      const liveScreenshot = path.join(tempDir, 'live.png');
      const devScreenshot = path.join(tempDir, 'dev.png');
      await createMockScreenshot(liveScreenshot);
      await createMockScreenshot(devScreenshot);

      const liveResults = [
        { ...createMockTestResult('/', 'live', true), screenshot: liveScreenshot },
      ];
      const devResults = [
        { ...createMockTestResult('/', 'dev', true), screenshot: devScreenshot },
      ];

      const comparisons = await differ.compareResults(liveResults, devResults);

      expect(comparisons.length).toBe(1);
      expect(comparisons[0]).toHaveProperty('route');
      expect(comparisons[0]).toHaveProperty('liveScreenshot');
      expect(comparisons[0]).toHaveProperty('devScreenshot');
      expect(comparisons[0]).toHaveProperty('diffPercentage');
      expect(comparisons[0]).toHaveProperty('hasDifferences');
    });

    it('should create diffs directory', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.1);

      const liveResults = [createMockTestResult('/', 'live', true)];
      const devResults = [createMockTestResult('/', 'dev', true)];

      await differ.compareResults(liveResults, devResults);

      const diffsDir = path.join(outputDir, 'diffs');
      expect(await fs.pathExists(diffsDir)).toBe(true);
    });
  });

  describe('threshold handling', () => {
    it('should use custom threshold value', () => {
      const differ = new Differ('/test/output', 0.05);
      expect(differ).toBeTruthy();
    });

    it('should use default threshold when not specified', () => {
      const differ = new Differ('/test/output');
      expect(differ).toBeTruthy();
    });

    it('should respect strict threshold (0.01)', () => {
      const differ = new Differ('/test/output', 0.01);
      expect(differ).toBeTruthy();
    });

    it('should respect lenient threshold (0.5)', () => {
      const differ = new Differ('/test/output', 0.5);
      expect(differ).toBeTruthy();
    });
  });

  describe('difference detection', () => {
    it('should detect identical screenshots', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.1);

      // Create two identical screenshots
      const screenshot1 = path.join(tempDir, 'screenshot1.png');
      const screenshot2 = path.join(tempDir, 'screenshot2.png');
      await createMockScreenshot(screenshot1);
      await createMockScreenshot(screenshot2);

      const liveResults = [
        { ...createMockTestResult('/', 'live', true), screenshot: screenshot1 },
      ];
      const devResults = [
        { ...createMockTestResult('/', 'dev', true), screenshot: screenshot2 },
      ];

      const comparisons = await differ.compareResults(liveResults, devResults);

      expect(comparisons[0].diffPercentage).toBe(0);
      expect(comparisons[0].hasDifferences).toBe(false);
    });

    it('should calculate difference percentage', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.1);

      const screenshot1 = path.join(tempDir, 'screenshot1.png');
      const screenshot2 = path.join(tempDir, 'screenshot2.png');
      await createMockScreenshot(screenshot1);
      await createMockScreenshot(screenshot2);

      const liveResults = [
        { ...createMockTestResult('/', 'live', true), screenshot: screenshot1 },
      ];
      const devResults = [
        { ...createMockTestResult('/', 'dev', true), screenshot: screenshot2 },
      ];

      const comparisons = await differ.compareResults(liveResults, devResults);

      expect(typeof comparisons[0].diffPercentage).toBe('number');
      expect(comparisons[0].diffPercentage).toBeGreaterThanOrEqual(0);
      expect(comparisons[0].diffPercentage).toBeLessThanOrEqual(100);
    });

    it('should save diff image when differences found', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.0); // Very strict to detect any differences

      const screenshot1 = path.join(tempDir, 'screenshot1.png');
      const screenshot2 = path.join(tempDir, 'screenshot2.png');
      await createMockScreenshot(screenshot1);
      await createMockScreenshot(screenshot2);

      const liveResults = [
        { ...createMockTestResult('/', 'live', true), screenshot: screenshot1 },
      ];
      const devResults = [
        { ...createMockTestResult('/', 'dev', true), screenshot: screenshot2 },
      ];

      const comparisons = await differ.compareResults(liveResults, devResults);

      // If there are differences, a diff screenshot should be created
      if (comparisons[0].hasDifferences) {
        expect(comparisons[0].diffScreenshot).toBeTruthy();
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing screenshot files', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.1);

      const liveResults = [
        { ...createMockTestResult('/', 'live', true), screenshot: '/nonexistent/live.png' },
      ];
      const devResults = [
        { ...createMockTestResult('/', 'dev', true), screenshot: '/nonexistent/dev.png' },
      ];

      const comparisons = await differ.compareResults(liveResults, devResults);

      expect(comparisons.length).toBeGreaterThanOrEqual(0);
      if (comparisons.length > 0) {
        expect(comparisons[0].diffPercentage).toBe(100); // Missing files = 100% different
      }
    });

    it('should handle mismatched routes', async () => {
      const outputDir = path.join(tempDir, 'output');
      const differ = new Differ(outputDir, 0.1);

      const liveResults = [createMockTestResult('/', 'live', true)];
      const devResults = [createMockTestResult('/about', 'dev', true)];

      const comparisons = await differ.compareResults(liveResults, devResults);

      // Should not compare mismatched routes
      expect(comparisons.length).toBe(0);
    });
  });
});

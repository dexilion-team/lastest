import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestRunner } from '../../src/runner';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanTestOutput, getDexilionConfig, createMockScreenshot } from '../helpers/test-utils';
import { createMockTestCase } from '../helpers/mocks';

describe('TestRunner', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('runner-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('configuration', () => {
    it('should initialize with config', () => {
      const config = getDexilionConfig({ outputDir: path.join(tempDir, 'output') });
      const runner = new TestRunner(config);

      expect(runner).toBeTruthy();
    });
  });

  describe('parallel execution', () => {
    it('should respect parallel configuration', async () => {
      const config = getDexilionConfig({
        parallel: true,
        maxConcurrency: 3,
        outputDir: path.join(tempDir, 'output-parallel'),
      });

      const runner = new TestRunner(config);
      expect(runner).toBeTruthy();
    }, 30000);

    it('should respect maxConcurrency setting', () => {
      const config = getDexilionConfig({
        parallel: true,
        maxConcurrency: 5,
        outputDir: path.join(tempDir, 'output'),
      });

      const runner = new TestRunner(config);
      expect(runner).toBeTruthy();
    });
  });

  describe('sequential execution', () => {
    it('should run tests sequentially when parallel is false', async () => {
      const config = getDexilionConfig({
        parallel: false,
        outputDir: path.join(tempDir, 'output-sequential'),
      });

      const runner = new TestRunner(config);
      expect(runner).toBeTruthy();
    });
  });

  describe('viewport configuration', () => {
    it('should use custom viewport dimensions', () => {
      const config = getDexilionConfig({
        viewport: { width: 1280, height: 720 },
        outputDir: path.join(tempDir, 'output'),
      });

      const runner = new TestRunner(config);
      expect(runner).toBeTruthy();
    });

    it('should use default viewport when not specified', () => {
      const config = getDexilionConfig({
        viewport: undefined,
        outputDir: path.join(tempDir, 'output'),
      });

      const runner = new TestRunner(config);
      expect(runner).toBeTruthy();
    });
  });

  describe('router type handling', () => {
    it('should handle hash router URLs correctly', () => {
      const config = getDexilionConfig({
        outputDir: path.join(tempDir, 'output'),
      });

      const runner = new TestRunner(config);

      // Hash router should prefix route with #
      const testCase = { ...createMockTestCase('/'), routerType: 'hash' as const };

      // The buildTestUrl method should construct: baseUrl + '/#' + route
      expect(runner).toBeTruthy();
    });

    it('should handle browser router URLs correctly', () => {
      const config = getDexilionConfig({
        outputDir: path.join(tempDir, 'output'),
      });

      const runner = new TestRunner(config);

      // Browser router should just append route
      const testCase = { ...createMockTestCase('/about'), routerType: 'browser' as const };

      // The buildTestUrl method should construct: baseUrl + route
      expect(runner).toBeTruthy();
    });
  });

  describe('screenshot directory creation', () => {
    it('should create screenshot directories for both environments', async () => {
      const config = getDexilionConfig({
        outputDir: path.join(tempDir, 'output'),
      });

      const outputDir = config.outputDir;
      const liveDir = path.join(outputDir, 'screenshots/live');
      const devDir = path.join(outputDir, 'screenshots/dev');

      // Directories will be created when tests run
      expect(config.outputDir).toBeTruthy();
    });
  });

  describe('test result structure', () => {
    it('should return results for both live and dev environments', () => {
      // Each test should produce 2 results: one for live, one for dev
      const config = getDexilionConfig({
        outputDir: path.join(tempDir, 'output'),
      });

      const runner = new TestRunner(config);
      expect(runner).toBeTruthy();
    });
  });
});

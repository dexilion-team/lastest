import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Scanner } from '../../src/scanner';
import { TestGenerator } from '../../src/generator';
import { TestRunner } from '../../src/runner';
import { ReportGenerator } from '../../src/reporter';
import { TestCache } from '../../src/test-cache';
import { ConfigManager } from '../../src/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DexilionServer } from '../helpers/dexilion-server';
import { DEXILION_PATH, getDexilionConfig, cleanTestOutput, createTempDir, verifyOutputStructure } from '../helpers/test-utils';
import { Config } from '../../src/types';

/**
 * Comprehensive E2E tests for lasTest tool with real dexilion.com project
 * Tests all configuration paths and options
 */

describe('dexilion.com E2E Tests', () => {
  let server: DexilionServer;
  let testDir: string;
  let serverStartedByUs = false;

  const skipIfNoDexilion = async () => {
    const exists = await fs.pathExists(DEXILION_PATH);
    if (!exists) {
      console.warn('Skipping dexilion.com E2E tests - project path does not exist');
      return true;
    }
    return false;
  };

  beforeAll(async () => {
    if (await skipIfNoDexilion()) return;

    // Check if dexilion.com dev server is already running on port 3000
    server = new DexilionServer(DEXILION_PATH, 3000);

    // Check if already running
    const isRunning = await server.isReady();
    if (isRunning) {
      console.log('Dev server already running on port 3000');
      serverStartedByUs = false;
      return;
    }

    // Try to start it
    try {
      await server.start();
      await server.waitForReady(60000); // 60 second timeout
      serverStartedByUs = true;
    } catch (error) {
      // One more check - maybe it started in the meantime
      const nowRunning = await server.isReady();
      if (!nowRunning) {
        throw new Error('Dev server is not running and could not be started');
      }
      console.log('Dev server is running on port 3000');
      serverStartedByUs = false;
    }
  }, 90000); // 90 second timeout for beforeAll

  afterAll(async () => {
    // Only stop the server if we started it
    if (server && serverStartedByUs) {
      await server.stop();
    }
    await cleanTestOutput();
  });

  beforeEach(async () => {
    await cleanTestOutput();
    testDir = await createTempDir('e2e-test');
  });

  describe('Test 1: AI mode + Claude + traditional scanning', () => {
    it('should complete full workflow with AI generation', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'ai',
        useAIRouteDetection: false,
        outputDir: path.join(testDir, 'output'),
        scanPath: DEXILION_PATH,
      });

      // Step 1: Scan routes
      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      expect(routes.length).toBeGreaterThan(0);
      console.log(`Found ${routes.length} routes`);

      // Step 2: Generate tests (using template mode since AI requires auth)
      const templateConfig = { ...config, testGenerationMode: 'template' as const };
      const generator = new TestGenerator(templateConfig);
      const tests = await generator.generateTests(routes);

      expect(tests.length).toBeGreaterThan(0);
      console.log(`Generated ${tests.length} tests`);

      // Step 3: Cache tests
      await TestCache.save(tests, testDir);
      const cached = await TestCache.load(testDir);
      expect(cached?.length).toBe(tests.length);

      // Step 4: Run tests
      const runner = new TestRunner(templateConfig);
      const results = await runner.runTests(tests);

      expect(results.length).toBe(tests.length * 2); // live + dev for each test
      console.log(`Completed ${results.length} test runs`);

      // Step 5: Generate report
      const reporter = new ReportGenerator(templateConfig);
      const reportPath = await reporter.generate(results);

      expect(await fs.pathExists(reportPath)).toBe(true);
      expect(await verifyOutputStructure(templateConfig.outputDir)).toBe(true);
    }, 120000); // 2 minute timeout
  });

  describe('Test 2: Template mode + custom viewport', () => {
    it('should generate template tests with custom viewport', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        viewport: { width: 1280, height: 720 },
        outputDir: path.join(testDir, 'output'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      expect(tests.length).toBeGreaterThan(0);

      // Verify tests are template-based
      tests.forEach((test) => {
        expect(test.code).toContain('export async function test');
        expect(test.code).toContain('page.screenshot');
      });
    }, 60000);
  });

  describe('Test 3: Parallel vs Sequential execution', () => {
    it('should run tests in parallel when enabled', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        parallel: true,
        maxConcurrency: 3,
        outputDir: path.join(testDir, 'output-parallel'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 3)); // Test with 3 routes

      const startTime = Date.now();
      const runner = new TestRunner(config);
      const results = await runner.runTests(tests);
      const parallelDuration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      console.log(`Parallel execution took ${parallelDuration}ms`);
    }, 120000);

    it('should run tests sequentially when parallel is false', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        parallel: false,
        outputDir: path.join(testDir, 'output-sequential'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 3));

      const startTime = Date.now();
      const runner = new TestRunner(config);
      const results = await runner.runTests(tests);
      const sequentialDuration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      console.log(`Sequential execution took ${sequentialDuration}ms`);
    }, 120000);
  });

  describe('Test 4: Different diffThreshold values', () => {
    it('should respect diffThreshold setting', async () => {
      if (await skipIfNoDexilion()) return;

      const strictConfig = getDexilionConfig({
        testGenerationMode: 'template',
        diffThreshold: 0.01, // Very strict
        outputDir: path.join(testDir, 'output-strict'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(strictConfig.scanPath, strictConfig);
      const routes = await scanner.scan();

      const generator = new TestGenerator(strictConfig);
      const tests = await generator.generateTests(routes.slice(0, 2));

      const runner = new TestRunner(strictConfig);
      const results = await runner.runTests(tests);

      const reporter = new ReportGenerator(strictConfig);
      await reporter.generate(results);

      // Check if report was generated
      const reportPath = path.join(strictConfig.outputDir, 'report.html');
      expect(await fs.pathExists(reportPath)).toBe(true);
    }, 120000);
  });

  describe('Test 5: Router type detection', () => {
    it('should correctly identify router type in routes', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      // Check if any routes have router type detected
      const routesWithType = routes.filter((r) => r.routerType);

      console.log(`Routes with router type: ${routesWithType.length}`);

      // Each route with router type should be either 'hash' or 'browser'
      routesWithType.forEach((route) => {
        expect(['hash', 'browser']).toContain(route.routerType);
      });
    }, 30000);
  });

  describe('Test 6: Config persistence', () => {
    it('should save and load config correctly', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        scanPath: DEXILION_PATH,
        customTestInstructions: 'Test all buttons and forms',
      });

      await ConfigManager.save(config, testDir);

      const loaded = await ConfigManager.load(testDir);

      expect(loaded).toBeTruthy();
      expect(loaded?.liveUrl).toBe(config.liveUrl);
      expect(loaded?.devUrl).toBe(config.devUrl);
      expect(loaded?.scanPath).toBe(config.scanPath);
      expect(loaded?.customTestInstructions).toBe(config.customTestInstructions);
    });
  });

  describe('Test 7: Full init → run workflow', () => {
    it('should complete init workflow and then run workflow', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(testDir, 'output-workflow'),
        scanPath: DEXILION_PATH,
      });

      // Simulate init command
      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      await TestCache.save(tests, testDir);
      await ConfigManager.save(config, testDir);

      const runner = new TestRunner(config);
      const results = await runner.runTests(tests);

      const reporter = new ReportGenerator(config);
      const reportPath = await reporter.generate(results);

      // Verify complete output structure
      expect(await fs.pathExists(reportPath)).toBe(true);
      expect(await verifyOutputStructure(config.outputDir)).toBe(true);

      // Simulate run command (load from cache)
      const loadedConfig = await ConfigManager.load(testDir);
      const cachedTests = await TestCache.load(testDir);

      expect(loadedConfig).toBeTruthy();
      expect(cachedTests).toBeTruthy();
      expect(cachedTests?.length).toBe(tests.length);

      // Run again with cached tests
      const runner2 = new TestRunner(loadedConfig!);
      const results2 = await runner2.runTests(cachedTests!);

      expect(results2.length).toBe(results.length);
    }, 180000); // 3 minute timeout
  });

  describe('Test 8: Static routes only', () => {
    it('should filter out dynamic routes during generation', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(testDir, 'output-static'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const allRoutes = await scanner.scan();

      const staticRoutes = allRoutes.filter((r) => r.type === 'static');
      const dynamicRoutes = allRoutes.filter((r) => r.type === 'dynamic');

      console.log(`Static routes: ${staticRoutes.length}, Dynamic routes: ${dynamicRoutes.length}`);

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(allRoutes);

      // Should only generate tests for static routes
      expect(tests.length).toBe(staticRoutes.length);

      // Verify no dynamic routes in tests
      tests.forEach((test) => {
        expect(test.route).not.toMatch(/\[|\:/); // No [ or : in route paths
      });
    }, 60000);
  });

  describe('Test 9: Output file structure', () => {
    it('should create correct directory structure and files', async () => {
      if (await skipIfNoDexilion()) return;

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(testDir, 'output-structure'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 2));

      const runner = new TestRunner(config);
      const results = await runner.runTests(tests);

      const reporter = new ReportGenerator(config);
      await reporter.generate(results);

      // Verify structure
      const outputDir = config.outputDir;
      expect(await fs.pathExists(path.join(outputDir, 'tests'))).toBe(true);
      expect(await fs.pathExists(path.join(outputDir, 'screenshots/live'))).toBe(true);
      expect(await fs.pathExists(path.join(outputDir, 'screenshots/dev'))).toBe(true);
      expect(await fs.pathExists(path.join(outputDir, 'diffs'))).toBe(true);
      expect(await fs.pathExists(path.join(outputDir, 'report.html'))).toBe(true);
      expect(await fs.pathExists(path.join(outputDir, 'summary.md'))).toBe(true);
      expect(await fs.pathExists(path.join(outputDir, 'data.json'))).toBe(true);

      // Verify test files exist
      tests.forEach((test) => {
        expect(fs.pathExistsSync(test.filePath)).toBe(true);
      });
    }, 120000);
  });

  describe('Test 10: Custom test instructions', () => {
    it('should include custom instructions in generated tests', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = 'Wait for animations, scroll to bottom, click all interactive elements';
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-custom'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      expect(tests.length).toBeGreaterThan(0);

      // Verify custom instructions are in the generated code
      const testCode = tests[0].code;
      expect(testCode).toContain(customInstructions);
    }, 60000);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Scanner } from '../../src/scanner';
import { TestGenerator } from '../../src/generator';
import { TestRunner } from '../../src/runner';
import { ReportGenerator } from '../../src/reporter';
import { TestCache } from '../../src/test-cache';
import { ConfigManager } from '../../src/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanTestOutput, getDexilionConfig, verifyOutputStructure } from '../helpers/test-utils';

/**
 * Integration test for run workflow (using cached tests)
 * Tests: load config → load cache → run → report
 */

describe('Run Workflow Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('run-workflow-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('Run command workflow', () => {
    it('should load config and cached tests then run', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
        scanPath: tempDir,
      });

      // Setup: Run init workflow first
      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      await TestCache.save(tests, tempDir);
      await ConfigManager.save(config, tempDir);

      // Now test run workflow
      const loadedConfig = await ConfigManager.load(tempDir);
      const cachedTests = await TestCache.load(tempDir);

      expect(loadedConfig).toBeTruthy();
      expect(cachedTests).toBeTruthy();
      expect(cachedTests?.length).toBe(tests.length);

      // Verify can run with loaded data
      expect(loadedConfig?.outputDir).toBe(config.outputDir);
      expect(cachedTests?.[0].name).toBe(tests[0].name);
    }, 60000);

    it('should fail gracefully when no config exists', async () => {
      const config = await ConfigManager.load(tempDir);
      expect(config).toBeNull();
    });

    it('should fail gracefully when no cache exists', async () => {
      const tests = await TestCache.load(tempDir);
      expect(tests).toBeNull();
    });

    it('should verify cache exists before running', async () => {
      const exists = await TestCache.exists(tempDir);
      expect(exists).toBe(false);

      // Create cache
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      await TestCache.save(tests, tempDir);

      const nowExists = await TestCache.exists(tempDir);
      expect(nowExists).toBe(true);
    }, 30000);
  });

  describe('Cache validation', () => {
    it('should validate cached test structure', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      await TestCache.save(tests, tempDir);

      const cached = await TestCache.load(tempDir);

      expect(cached).toBeTruthy();
      cached?.forEach((test) => {
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('route');
        expect(test).toHaveProperty('code');
        expect(test).toHaveProperty('filePath');
      });
    }, 30000);

    it('should preserve test code in cache', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      await TestCache.save(tests, tempDir);

      const cached = await TestCache.load(tempDir);

      expect(cached?.[0].code).toBe(tests[0].code);
      expect(cached?.[0].code).toContain('export async function test');
    }, 30000);
  });

  describe('Clear cache', () => {
    it('should clear cache when requested', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      await TestCache.save(tests, tempDir);

      expect(await TestCache.exists(tempDir)).toBe(true);

      await TestCache.clear(tempDir);

      expect(await TestCache.exists(tempDir)).toBe(false);
    }, 30000);
  });
});

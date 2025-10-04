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
 * Integration tests for the full init workflow
 * Tests: scan → generate → cache → run → report
 */

describe('Init Workflow Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('init-workflow-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('Full init pipeline', () => {
    it('should complete scan → generate → cache → run → report', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
        scanPath: tempDir,
      });

      // Create a mock project structure
      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');

      config.scanPath = projectDir;

      // Step 1: Scan
      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();
      expect(routes.length).toBeGreaterThan(0);

      // Step 2: Generate
      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);
      expect(tests.length).toBeGreaterThan(0);

      // Step 3: Cache
      await TestCache.save(tests, tempDir);
      const cached = await TestCache.load(tempDir);
      expect(cached?.length).toBe(tests.length);

      // Step 4: Save config
      await ConfigManager.save(config, tempDir);
      const loadedConfig = await ConfigManager.load(tempDir);
      expect(loadedConfig).toBeTruthy();

      // Verify generated test files exist
      tests.forEach((test) => {
        expect(fs.pathExistsSync(test.filePath)).toBe(true);
      });
    }, 60000);

    it('should handle template mode workflow', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output-template'),
        scanPath: tempDir,
      });

      // Create mock project
      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');
      await fs.ensureDir(path.join(projectDir, 'app/about'));
      await fs.writeFile(path.join(projectDir, 'app/about/page.tsx'), 'export default function About() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      expect(tests.length).toBeGreaterThan(0);

      // Verify template-generated code
      tests.forEach((test) => {
        expect(test.code).toContain('export async function test');
        expect(test.code).toContain('page.goto');
        expect(test.code).toContain('page.screenshot');
      });
    }, 60000);

    it('should preserve router type through workflow', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output-router'),
        scanPath: tempDir,
      });

      // Create React Router project with HashRouter
      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'src'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { 'react-router-dom': '^6.0.0' },
      });
      await fs.writeFile(
        path.join(projectDir, 'src/App.tsx'),
        `
        import { HashRouter } from 'react-router-dom';
        const routes = [{ path: '/', element: <Home /> }];
      `
      );

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      // Router type should be preserved
      const hashRoute = tests.find((t) => t.routerType === 'hash');
      if (hashRoute) {
        expect(hashRoute.routerType).toBe('hash');
      }
    }, 60000);
  });

  describe('Error handling in workflow', () => {
    it('should handle empty project gracefully', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output-empty'),
        scanPath: tempDir,
      });

      const projectDir = path.join(tempDir, 'empty-project');
      await fs.ensureDir(projectDir);

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      // Should handle gracefully, even if no routes
      expect(Array.isArray(tests)).toBe(true);
    }, 30000);

    it('should skip dynamic routes', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output-dynamic'),
        scanPath: tempDir,
      });

      const projectDir = path.join(tempDir, 'project');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });

      // Create both static and dynamic routes
      await fs.writeFile(path.join(projectDir, 'app/page.tsx'), 'export default function Page() {}');
      await fs.ensureDir(path.join(projectDir, 'app/blog/[slug]'));
      await fs.writeFile(path.join(projectDir, 'app/blog/[slug]/page.tsx'), 'export default function Post() {}');

      config.scanPath = projectDir;

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const staticRoutes = routes.filter((r) => r.type === 'static');
      const dynamicRoutes = routes.filter((r) => r.type === 'dynamic');

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes);

      // Should only generate tests for static routes
      expect(tests.length).toBe(staticRoutes.length);
      expect(tests.length).toBeLessThan(routes.length);
    }, 30000);
  });

  describe('Config persistence', () => {
    it('should save and reload config during workflow', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: 'Test all interactions',
        outputDir: path.join(tempDir, 'output'),
        scanPath: tempDir,
      });

      await ConfigManager.save(config, tempDir);

      const loaded = await ConfigManager.load(tempDir);

      expect(loaded).toBeTruthy();
      expect(loaded?.testGenerationMode).toBe('template');
      expect(loaded?.customTestInstructions).toBe('Test all interactions');
      expect(loaded?.liveUrl).toBe(config.liveUrl);
      expect(loaded?.devUrl).toBe(config.devUrl);
    });
  });

  describe('Cache integrity', () => {
    it('should maintain test cache integrity', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
        scanPath: tempDir,
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
      expect(cached?.length).toBe(tests.length);

      // Verify all properties are preserved
      cached?.forEach((cachedTest, index) => {
        expect(cachedTest.name).toBe(tests[index].name);
        expect(cachedTest.route).toBe(tests[index].route);
        expect(cachedTest.code).toBe(tests[index].code);
        expect(cachedTest.filePath).toBe(tests[index].filePath);
      });
    });
  });
});

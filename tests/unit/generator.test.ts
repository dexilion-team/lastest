import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestGenerator } from '../../src/generator';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanTestOutput, getDexilionConfig } from '../helpers/test-utils';
import { createMockRoute, MockAIClient } from '../helpers/mocks';

describe('TestGenerator', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('generator-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('AI mode', () => {
    it('should initialize with AI client when mode is ai', () => {
      const config = getDexilionConfig({ testGenerationMode: 'ai' });
      const generator = new TestGenerator(config);

      expect(generator).toBeTruthy();
    });

    it('should skip dynamic routes', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const generator = new TestGenerator(config);
      const routes = [
        createMockRoute('/', 'static'),
        createMockRoute('/blog/[slug]', 'dynamic'),
        createMockRoute('/about', 'static'),
      ];

      const tests = await generator.generateTests(routes);

      // Should only generate 2 tests (skip dynamic)
      expect(tests.length).toBe(2);
      expect(tests.find((t) => t.route === '/')).toBeTruthy();
      expect(tests.find((t) => t.route === '/about')).toBeTruthy();
      expect(tests.find((t) => t.route === '/blog/[slug]')).toBeFalsy();
    });

    it('should create test files in output directory', async () => {
      const outputDir = path.join(tempDir, 'output');
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir,
      });

      const generator = new TestGenerator(config);
      const routes = [createMockRoute('/', 'static')];

      const tests = await generator.generateTests(routes);

      expect(tests.length).toBe(1);
      expect(await fs.pathExists(tests[0].filePath)).toBe(true);
    });
  });

  describe('Template mode', () => {
    it('should initialize with template generator when mode is template', () => {
      const config = getDexilionConfig({ testGenerationMode: 'template' });
      const generator = new TestGenerator(config);

      expect(generator).toBeTruthy();
    });

    it('should generate template tests without AI', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const generator = new TestGenerator(config);
      const routes = [createMockRoute('/', 'static'), createMockRoute('/about', 'static')];

      const tests = await generator.generateTests(routes);

      expect(tests.length).toBe(2);
      tests.forEach((test) => {
        expect(test.code).toContain('export async function test');
        expect(test.code).toContain('page.goto');
        expect(test.code).toContain('page.screenshot');
      });
    });

    it('should include custom instructions in template tests', async () => {
      const customInstructions = 'Click newsletter button and submit';
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(tempDir, 'output'),
      });

      const generator = new TestGenerator(config);
      const routes = [createMockRoute('/', 'static')];

      const tests = await generator.generateTests(routes);

      expect(tests[0].code).toContain(customInstructions);
      expect(tests[0].code).toContain('Custom test instructions');
    });
  });

  describe('Test name generation', () => {
    it('should convert route paths to valid filenames', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const generator = new TestGenerator(config);
      const routes = [
        createMockRoute('/', 'static'),
        createMockRoute('/about', 'static'),
        createMockRoute('/blog/posts', 'static'),
        createMockRoute('/contact-us', 'static'),
      ];

      const tests = await generator.generateTests(routes);

      expect(tests[0].name).toBe('home-desktop');
      expect(tests[1].name).toBe('about-desktop');
      expect(tests[2].name).toBe('blog-posts-desktop');
      expect(tests[3].name).toBe('contact-us-desktop');
    });
  });

  describe('Router type handling', () => {
    it('should preserve router type in test cases', async () => {
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        outputDir: path.join(tempDir, 'output'),
      });

      const generator = new TestGenerator(config);
      const routes = [
        { ...createMockRoute('/', 'static'), routerType: 'hash' as const },
        { ...createMockRoute('/about', 'static'), routerType: 'browser' as const },
      ];

      const tests = await generator.generateTests(routes);

      expect(tests[0].routerType).toBe('hash');
      expect(tests[1].routerType).toBe('browser');
    });
  });
});

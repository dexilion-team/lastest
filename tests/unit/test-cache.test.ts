import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestCache } from '../../src/test-cache';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanTestOutput } from '../helpers/test-utils';
import { createMockTestCase } from '../helpers/mocks';

describe('TestCache', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('cache-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('save', () => {
    it('should save tests to cache file', async () => {
      const tests = [createMockTestCase('/'), createMockTestCase('/about')];

      await TestCache.save(tests, tempDir);

      const cachePath = path.join(tempDir, '.lastest-tests.json');
      expect(await fs.pathExists(cachePath)).toBe(true);
    });

    it('should save tests with proper JSON formatting', async () => {
      const tests = [createMockTestCase('/'), createMockTestCase('/about')];

      await TestCache.save(tests, tempDir);

      const cachePath = path.join(tempDir, '.lastest-tests.json');
      const content = await fs.readFile(cachePath, 'utf-8');

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();

      // Should be formatted (indented)
      expect(content).toContain('\n');
    });

    it('should overwrite existing cache', async () => {
      const tests1 = [createMockTestCase('/')];
      await TestCache.save(tests1, tempDir);

      const tests2 = [createMockTestCase('/'), createMockTestCase('/about')];
      await TestCache.save(tests2, tempDir);

      const loaded = await TestCache.load(tempDir);
      expect(loaded?.length).toBe(2);
    });
  });

  describe('load', () => {
    it('should load cached tests', async () => {
      const tests = [createMockTestCase('/'), createMockTestCase('/about'), createMockTestCase('/contact')];

      await TestCache.save(tests, tempDir);
      const loaded = await TestCache.load(tempDir);

      expect(loaded).toBeTruthy();
      expect(loaded?.length).toBe(3);
      expect(loaded?.[0].route).toBe('/');
      expect(loaded?.[1].route).toBe('/about');
      expect(loaded?.[2].route).toBe('/contact');
    });

    it('should return null when cache does not exist', async () => {
      const loaded = await TestCache.load(tempDir);
      expect(loaded).toBeNull();
    });

    it('should preserve all test case properties', async () => {
      const tests = [
        {
          name: 'home',
          route: '/',
          code: 'export async function test() {}',
          filePath: '/test/home.ts',
          routerType: 'hash' as const,
        },
      ];

      await TestCache.save(tests, tempDir);
      const loaded = await TestCache.load(tempDir);

      expect(loaded?.[0]).toEqual(tests[0]);
    });
  });

  describe('exists', () => {
    it('should return true when cache exists', async () => {
      const tests = [createMockTestCase('/')];
      await TestCache.save(tests, tempDir);

      const exists = await TestCache.exists(tempDir);
      expect(exists).toBe(true);
    });

    it('should return false when cache does not exist', async () => {
      const exists = await TestCache.exists(tempDir);
      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove cache file', async () => {
      const tests = [createMockTestCase('/')];
      await TestCache.save(tests, tempDir);

      await TestCache.clear(tempDir);

      const exists = await TestCache.exists(tempDir);
      expect(exists).toBe(false);
    });

    it('should not throw when cache does not exist', async () => {
      await expect(TestCache.clear(tempDir)).resolves.not.toThrow();
    });
  });
});

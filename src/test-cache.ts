import * as fs from 'fs-extra';
import * as path from 'path';
import { TestCase } from './types';

const TEST_CACHE_FILE = '.lastest-tests.json';

export class TestCache {
  /**
   * Save generated tests to cache file
   */
  static async save(tests: TestCase[], cwd: string = process.cwd()): Promise<void> {
    const cachePath = path.join(cwd, TEST_CACHE_FILE);
    await fs.writeFile(cachePath, JSON.stringify(tests, null, 2));
  }

  /**
   * Load previously generated tests from cache
   */
  static async load(cwd: string = process.cwd()): Promise<TestCase[] | null> {
    const cachePath = path.join(cwd, TEST_CACHE_FILE);

    if (await fs.pathExists(cachePath)) {
      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    }

    return null;
  }

  /**
   * Check if test cache exists
   */
  static async exists(cwd: string = process.cwd()): Promise<boolean> {
    const cachePath = path.join(cwd, TEST_CACHE_FILE);
    return await fs.pathExists(cachePath);
  }

  /**
   * Clear test cache
   */
  static async clear(cwd: string = process.cwd()): Promise<void> {
    const cachePath = path.join(cwd, TEST_CACHE_FILE);
    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }
  }
}

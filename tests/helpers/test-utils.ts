import * as fs from 'fs-extra';
import * as path from 'path';
import { Config } from '../../src/types';

/**
 * Test utilities for lasTest test suite
 */

export const DEXILION_PATH = '/home/wyctor/dexilion.com';
export const TEST_OUTPUT_DIR = path.join(__dirname, '../.test-output');

/**
 * Get test configuration for dexilion.com
 */
export function getDexilionConfig(overrides?: Partial<Config>): Config {
  return {
    aiProvider: 'claude-subscription',
    liveUrl: 'https://dexilion.com/',
    devUrl: 'http://localhost:3000',
    scanPath: DEXILION_PATH,
    outputDir: path.join(TEST_OUTPUT_DIR, 'lastest-results'),
    viewport: { width: 1920, height: 1080 },
    diffThreshold: 0.1,
    parallel: true,
    maxConcurrency: 5,
    testGenerationMode: 'ai',
    useAIRouteDetection: false,
    ...overrides,
  };
}

/**
 * Clean up test output directory
 * Note: This is now a no-op to prevent race conditions in parallel tests.
 * Tests should use unique temp directories instead.
 */
export async function cleanTestOutput(): Promise<void> {
  // Ensure the output directory exists but don't clean it
  await fs.ensureDir(TEST_OUTPUT_DIR);
}

/**
 * Create a temporary test directory with unique ID
 */
export async function createTempDir(name: string): Promise<string> {
  const uniqueId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tempDir = path.join(TEST_OUTPUT_DIR, uniqueId);
  await fs.ensureDir(tempDir);
  return tempDir;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Check if a file exists and has content
 */
export async function fileHasContent(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * Read JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Create a mock screenshot file (1x1 PNG)
 */
export async function createMockScreenshot(filePath: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  // Simple 1x1 red PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  await fs.writeFile(filePath, png);
}

/**
 * Verify directory structure
 */
export async function verifyOutputStructure(outputDir: string): Promise<boolean> {
  const requiredDirs = ['tests', 'screenshots/live', 'screenshots/dev', 'diffs'];
  const requiredFiles = ['report.html', 'summary.md', 'data.json'];

  for (const dir of requiredDirs) {
    if (!(await fs.pathExists(path.join(outputDir, dir)))) {
      return false;
    }
  }

  for (const file of requiredFiles) {
    if (!(await fs.pathExists(path.join(outputDir, file)))) {
      return false;
    }
  }

  return true;
}

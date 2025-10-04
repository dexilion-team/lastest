import { RouteInfo, TestCase, TestResult, Config } from '../../src/types';

/**
 * Mock data and utilities for testing
 */

export function createMockRoute(path: string, type: 'static' | 'dynamic' = 'static'): RouteInfo {
  return {
    path,
    type,
    filePath: `/test/path/${path}/page.tsx`,
    component: 'page.tsx',
  };
}

export function createMockTestCase(route: string, name?: string): TestCase {
  return {
    name: name || route.replace(/\//g, '-').slice(1) || 'home',
    route,
    code: `export async function test() { /* mock test */ }`,
    filePath: `/test/tests/${name || 'test'}.ts`,
  };
}

export function createMockTestResult(
  route: string,
  environment: 'live' | 'dev',
  passed: boolean = true
): TestResult {
  return {
    route,
    url: `https://example.com${route}`,
    environment,
    passed,
    screenshot: `/test/screenshots/${environment}/${route.replace(/\//g, '-')}.png`,
    duration: 1000,
    error: passed ? undefined : 'Test failed',
  };
}

/**
 * Mock AI client for testing
 */
export class MockAIClient {
  constructor(private config?: Config) {}

  async generateTest(route: RouteInfo): Promise<string> {
    const customInstructions = this.config?.customTestInstructions
      ? `\n// Custom instructions: ${this.config.customTestInstructions}`
      : '';

    return `import { Page } from 'playwright';

/**
 * Mock AI-generated test for route: ${route.path}
 */
export async function test(page: Page, baseUrl: string, screenshotPath: string) {
  await page.goto(baseUrl + '${route.path}', { waitUntil: 'networkidle' });${customInstructions}
  await page.screenshot({ path: screenshotPath, fullPage: true });
}
`;
  }

  async testConnection(): Promise<void> {
    // Mock connection test - always succeeds
    return Promise.resolve();
  }
}

/**
 * Mock Scanner for testing
 */
export class MockScanner {
  private routes: RouteInfo[] = [
    createMockRoute('/'),
    createMockRoute('/about'),
    createMockRoute('/contact'),
  ];

  setRoutes(routes: RouteInfo[]) {
    this.routes = routes;
  }

  async scan(): Promise<RouteInfo[]> {
    return this.routes;
  }
}

/**
 * Create mock config file in a directory
 */
export function createMockConfig(overrides?: Partial<Config>): Config {
  return {
    aiProvider: 'claude-subscription',
    liveUrl: 'https://example.com',
    devUrl: 'http://localhost:3000',
    scanPath: '.',
    outputDir: 'test-output',
    viewport: { width: 1920, height: 1080 },
    diffThreshold: 0.1,
    parallel: false,
    maxConcurrency: 1,
    ...overrides,
  };
}

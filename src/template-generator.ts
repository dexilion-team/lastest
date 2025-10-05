import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, RouteInfo, TestCase } from './types';
import { Logger } from './utils/logger';

/**
 * Template-based Test Generator
 * Generates simple screenshot tests without AI
 */
export class TemplateGenerator {
  constructor(private config: Config) {}

  async generateTests(routes: RouteInfo[]): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    const testsDir = path.join(this.config.outputDir, 'tests');

    await fs.ensureDir(testsDir);

    for (const route of routes) {
      // Skip dynamic routes
      if (route.type === 'dynamic') {
        Logger.warn(`Skipping dynamic route: ${route.path}`);
        continue;
      }

      try {
        Logger.dim(`  Generating template test for ${route.path}...`);
        const code = this.buildTestTemplate(route);

        const testName = this.getTestName(route.path);
        const filePath = path.join(testsDir, `${testName}.ts`);

        await fs.writeFile(filePath, code);

        tests.push({
          name: testName,
          route: route.path,
          code,
          filePath,
          routerType: route.routerType,
        });
      } catch (error) {
        Logger.error(`Failed to generate template test for ${route.path}: ${(error as Error).message}`);
      }
    }

    return tests;
  }

  private buildTestTemplate(route: RouteInfo): string {
    const customInstructions = this.config.customTestInstructions || '';

    return `import { Page } from 'playwright';

/**
 * Template-generated test for route: ${route.path}
 * Type: ${route.type}
 * Router: ${route.routerType || 'browser'}
 */
export async function test(page: Page, baseUrl: string, screenshotPath: string) {
  try {
    // Navigate to the route
    const url = ${route.routerType === 'hash' ? `baseUrl + '/#' + '${route.path}'` : `baseUrl + '${route.path}'`};
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for any animations or dynamic content
    await page.waitForTimeout(1000);

    ${customInstructions ? `// Custom test instructions: ${customInstructions}\n    // Note: Template mode - custom instructions are documented but not executed` : ''}

    // Take full-page screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    return screenshotPath;
  } catch (error) {
    throw new Error(\`Test failed for ${route.path}: \${(error as Error).message}\`);
  }
}
`;
  }

  private getTestName(routePath: string): string {
    // Convert route path to valid filename
    // Handle root path specially
    if (routePath === '/') {
      return 'home';
    }

    // Strip leading slash and convert to filename
    return routePath
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase() || 'index';
  }
}

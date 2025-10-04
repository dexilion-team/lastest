import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, RouteInfo, TestCase } from './types';
import { ClaudeSubscriptionClient } from './ai/claude-subscription';
import { CopilotSubscriptionClient } from './ai/copilot-subscription';
import { TemplateGenerator } from './template-generator';
import { Logger } from './utils/logger';

type AIClient = ClaudeSubscriptionClient | CopilotSubscriptionClient;

export class TestGenerator {
  private aiClient?: AIClient;
  private templateGenerator?: TemplateGenerator;

  constructor(private config: Config) {
    const mode = config.testGenerationMode || 'ai';

    if (mode === 'template') {
      this.templateGenerator = new TemplateGenerator(config);
    } else {
      // AI mode
      switch (config.aiProvider) {
        case 'claude-subscription':
          this.aiClient = new ClaudeSubscriptionClient(config);
          break;

        case 'copilot-subscription':
          this.aiClient = new CopilotSubscriptionClient(config);
          break;

        default:
          throw new Error(`Unknown AI provider: ${config.aiProvider}`);
      }
    }
  }

  async generateTests(routes: RouteInfo[]): Promise<TestCase[]> {
    // Use template generator if in template mode
    if (this.templateGenerator) {
      return await this.templateGenerator.generateTests(routes);
    }

    // Otherwise use AI generation
    if (!this.aiClient) {
      throw new Error('AI client not initialized');
    }

    const tests: TestCase[] = [];
    const testsDir = path.join(this.config.outputDir, 'tests');

    await fs.ensureDir(testsDir);

    for (const route of routes) {
      // Skip dynamic routes for now (would need example data)
      if (route.type === 'dynamic') {
        Logger.warn(`Skipping dynamic route: ${route.path}`);
        continue;
      }

      try {
        Logger.dim(`  Generating test for ${route.path}...`);
        const code = await this.aiClient.generateTest(route);

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
        Logger.error(`Failed to generate test for ${route.path}: ${(error as Error).message}`);
      }
    }

    return tests;
  }

  private getTestName(routePath: string): string {
    // Convert route path to valid filename
    return routePath
      .replace(/^\//, 'home')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase() || 'index';
  }
}

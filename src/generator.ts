import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, RouteInfo, TestCase } from './types';
import { ClaudeSubscriptionClient } from './ai/claude-subscription';
import { CopilotSubscriptionClient } from './ai/copilot-subscription';
import { TemplateGenerator } from './template-generator';
import { MCPGenerator } from './mcp-generator';
import { TestRecorder } from './recorder';
import { Logger } from './utils/logger';

type AIClient = ClaudeSubscriptionClient | CopilotSubscriptionClient;

export class TestGenerator {
  private aiClient?: AIClient;
  private templateGenerator?: TemplateGenerator;
  private mcpGenerator?: MCPGenerator;
  private recorder?: TestRecorder;

  constructor(private config: Config) {
    const mode = config.testGenerationMode || 'ai';

    if (mode === 'template') {
      this.templateGenerator = new TemplateGenerator(config);
    } else if (mode === 'mcp') {
      // MCP mode - uses AI + MCP validation
      this.mcpGenerator = new MCPGenerator(config);
    } else if (mode === 'record') {
      // Recording mode - interactive browser recording
      const recordingViewport = (config as Config & { recordingViewport?: { name: string; slug: string; width: number; height: number } }).recordingViewport;
      this.recorder = new TestRecorder({
        startUrl: config.recordingStartUrl || config.liveUrl,
        screenshotHotkey: config.screenshotHotkey || 'Control+Shift+KeyS',
        outputDir: config.outputDir,
        viewport: recordingViewport,
      });
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
    // Use recorder if in recording mode
    if (this.recorder) {
      Logger.info('Starting interactive recording session...');
      const recordedTest = await this.recorder.startRecording();
      return [recordedTest];
    }

    // Use template generator if in template mode
    if (this.templateGenerator) {
      return await this.templateGenerator.generateTests(routes);
    }

    // Use MCP generator if in MCP mode
    if (this.mcpGenerator) {
      return await this.mcpGenerator.generateTests(routes);
    }

    // Otherwise use AI generation
    if (!this.aiClient) {
      throw new Error('AI client not initialized');
    }

    const tests: TestCase[] = [];
    const testsDir = path.join(this.config.outputDir, 'tests');
    const viewports = this.config.viewports || [
      { name: 'Desktop', slug: 'desktop', width: 1920, height: 1080 }
    ];

    await fs.ensureDir(testsDir);

    for (const route of routes) {
      // Skip dynamic routes for now (would need example data)
      if (route.type === 'dynamic') {
        Logger.warn(`Skipping dynamic route: ${route.path}`);
        continue;
      }

      for (const viewport of viewports) {
        try {
          Logger.dim(`  Generating test for ${route.path} on ${viewport.name}...`);
          const code = await this.aiClient.generateTest(route, viewport);

          const testName = `${this.getTestName(route.path)}-${viewport.slug}`;
          const filePath = path.join(testsDir, `${testName}.ts`);

          await fs.writeFile(filePath, code);

          tests.push({
            name: testName,
            route: route.path,
            code,
            filePath,
            routerType: route.routerType,
            viewport: viewport.slug,
          });
        } catch (error) {
          Logger.captureError(error as Error, `Failed to generate test for ${route.path} on ${viewport.name}`);
        }
      }
    }

    return tests;
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

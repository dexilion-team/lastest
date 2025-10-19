import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, RouteInfo, TestCase } from './types';
import { ClaudeSubscriptionClient } from './ai/claude-subscription';
import { CopilotSubscriptionClient } from './ai/copilot-subscription';
import { MCPValidator, ValidationResult } from './mcp-validator';
import { Logger } from './utils/logger';

type AIClient = ClaudeSubscriptionClient | CopilotSubscriptionClient;

/**
 * MCP-Enhanced Test Generator
 * Combines AI code generation with MCP validation and refinement
 */
export class MCPGenerator {
  private aiClient: AIClient;
  private mcpValidator: MCPValidator;

  constructor(private config: Config) {
    // Initialize AI client based on provider
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

    // Initialize MCP validator
    this.mcpValidator = new MCPValidator();
  }

  /**
   * Generate tests with AI + MCP validation
   */
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
        Logger.dim(`  Generating MCP-enhanced test for ${route.path}...`);

        // Generate test with AI + MCP validation
        const code = await this.generateTest(route);

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

        Logger.dim(`    ✓ Test generated and validated`);
      } catch (error) {
        Logger.captureError(
          error as Error,
          `Failed to generate MCP-enhanced test for ${route.path}`
        );
      }
    }

    return tests;
  }

  /**
   * Generate a single test with MCP validation and refinement
   */
  private async generateTest(route: RouteInfo): Promise<string> {
    // Step 1: AI generates initial test code
    Logger.dim(`    AI generating initial test...`);
    const initialCode = await this.aiClient.generateTest(route);

    // Step 2: Validate test with MCP (against live URL first)
    const validation = await this.mcpValidator.validateTest(
      route,
      initialCode,
      this.config.liveUrl
    );

    // Step 3: Check if refinement is needed
    const needsRefinement =
      !validation.selectorsValid ||
      validation.suggestedInteractions.length > 0 ||
      validation.validationErrors.length > 0;

    if (needsRefinement) {
      Logger.dim(`    MCP found issues, refining test...`);

      // Refine test based on MCP feedback
      const refinedCode = await this.refineTest(route, initialCode, validation);

      // Optional: Second validation pass
      // const finalValidation = await this.mcpValidator.validateTest(
      //   route,
      //   refinedCode,
      //   this.config.liveUrl
      // );

      return refinedCode;
    }

    Logger.dim(`    MCP validation passed`);
    return initialCode;
  }

  /**
   * Refine test based on MCP validation feedback
   */
  private async refineTest(
    route: RouteInfo,
    originalCode: string,
    validation: ValidationResult
  ): Promise<string> {
    // Check if AI client has refineTest method
    if ('refineTest' in this.aiClient) {
      return await this.aiClient.refineTest(route, originalCode, validation);
    }

    // Fallback: return original code if refineTest not implemented
    Logger.warn('AI client does not support refineTest, using original code');
    return originalCode;
  }

  /**
   * Convert route path to valid filename
   */
  private getTestName(routePath: string): string {
    // Handle root path specially
    if (routePath === '/') {
      return 'home';
    }

    // Strip leading slash and convert to filename
    return (
      routePath
        .replace(/^\//, '')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toLowerCase() || 'index'
    );
  }
}

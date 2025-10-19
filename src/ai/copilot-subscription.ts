import { RouteInfo, Config } from '../types';
import { ValidationResult } from '../mcp-validator';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * GitHub Copilot Subscription Client
 * Uses GitHub Copilot CLI with Copilot Pro/Business/Enterprise subscription
 * Requires: npm install -g @github/copilot
 * Authentication: Use /login command in copilot or set GITHUB_TOKEN env var
 */
export class CopilotSubscriptionClient {
  constructor(private config?: Config) {
    // No API key needed - uses authenticated GitHub Copilot CLI
  }

  async generateTest(route: RouteInfo): Promise<string> {
    // Check if Copilot CLI is available
    await this.checkCopilotCLI();

    const prompt = this.buildPrompt(route);

    try {
      // Use copilot CLI in programmatic mode with --allow-all-tools for non-interactive use
      // --deny-tool write prevents file creation and returns code as stdout
      const command = `copilot -p "${this.escapePrompt(prompt)}" --allow-all-tools --deny-tool write`;

      const { stdout } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10, // 10MB
        timeout: 60000, // 60 seconds
      });

      // Validate response
      if (!stdout || stdout.trim().length === 0) {
        const err = new Error('GitHub Copilot returned an empty response');
        Logger.captureError(err, 'Copilot test generation - empty response');
        throw err;
      }

      const code = this.extractCode(stdout);

      // Validate extracted code
      if (!code || code.trim().length === 0) {
        const err = new Error('GitHub Copilot response did not contain valid TypeScript code');
        Logger.captureError(err, 'Copilot test generation - no code extracted');
        throw err;
      }

      // Basic validation: check if it looks like TypeScript
      if (!code.includes('export') && !code.includes('function')) {
        const err = new Error('GitHub Copilot response does not appear to contain a valid test function');
        Logger.captureError(err, 'Copilot test generation - invalid code format');
        throw err;
      }

      return code;
    } catch (error) {
      // If error is already captured (from validation above), re-throw it
      if ((error as Error).message.includes('GitHub Copilot returned an empty response') ||
          (error as Error).message.includes('did not contain valid TypeScript code') ||
          (error as Error).message.includes('does not appear to contain a valid test function')) {
        throw error;
      }

      // Otherwise, wrap and capture the error
      const err = new Error(
        `GitHub Copilot error: ${(error as Error).message}\n` +
          `Make sure you've:\n` +
          `1. Installed: npm install -g @github/copilot\n` +
          `2. Authenticated: Run 'copilot' and use /login command, or set GITHUB_TOKEN\n` +
          `3. Have an active Copilot subscription (Pro/Business/Enterprise)`
      );
      Logger.captureError(err, 'Copilot test generation');
      throw err;
    }
  }

  async testConnection(): Promise<void> {
    // Check CLI availability
    await this.checkCopilotCLI();

    try {
      // Test with a simple prompt using --allow-all-tools for non-interactive mode
      // --deny-tool write prevents file creation
      const command = `copilot -p "hello" --allow-all-tools --deny-tool write`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 15000, // 15 seconds
      });

      // Check if the output suggests authentication issues
      const output = stdout + stderr;
      if (output.toLowerCase().includes('not authenticated') || output.toLowerCase().includes('login')) {
        throw new Error('Not authenticated');
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      let err: Error;
      if (errorMsg.includes('not authenticated') || errorMsg.includes('login')) {
        err = new Error(
          `GitHub Copilot not authenticated. Please authenticate:\n` +
            `  Option 1: Run 'copilot' and use /login command\n` +
            `  Option 2: Set GITHUB_TOKEN environment variable`
        );
      } else {
        err = new Error(
          `GitHub Copilot connection failed: ${errorMsg}\n` +
            `Make sure you have an active Copilot subscription (Pro/Business/Enterprise)`
        );
      }
      Logger.captureError(err, 'Copilot connection test');
      throw err;
    }
  }

  private async checkCopilotCLI(): Promise<void> {
    try {
      await execAsync('copilot --version');
    } catch (error) {
      throw new Error(
        'GitHub Copilot CLI not found. Please install:\n' +
          '1. npm install -g @github/copilot\n' +
          '2. Authenticate: Run copilot and use /login command, or set GITHUB_TOKEN\n' +
          '   Requires: Node.js 22+ and active Copilot subscription'
      );
    }
  }

  private buildPrompt(route: RouteInfo): string {
    return `Generate a Playwright test for the following route:

Route: ${route.path}
Type: ${route.type}
${route.filePath ? `File: ${route.filePath}` : ''}

Requirements:
1. Create a test that navigates to the route
2. Wait for the page to load (use 'networkidle' or 'domcontentloaded')
3. Take a full-page screenshot
4. Keep it SIMPLE - do NOT try to guess CSS selectors or element IDs from the route name
5. Only wait for elements if you have specific custom instructions
6. Make the test reusable for both live and dev environments
${this.config?.customTestInstructions ? `7. ${this.config.customTestInstructions}` : ''}

IMPORTANT:
- DO NOT use page.waitForSelector() unless specifically instructed
- DO NOT guess class names or IDs based on the route path
- Focus on navigation, load state, and screenshot
- Use short timeouts (5-10 seconds max) if you must wait for specific elements

Return ONLY the TypeScript test code, no explanations. The test should:
- Import necessary Playwright modules
- Export a function called 'test' that accepts (page, baseUrl, screenshotPath, stepLogger)
- Use stepLogger.log() to record each major step (navigation, interactions, screenshot)
- Navigate to baseUrl + route.path
- Wait for page to be fully loaded (use page.waitForLoadState)
${this.config?.customTestInstructions ? `- ${this.config.customTestInstructions}` : ''}
- Take a screenshot with the provided screenshotPath
- Keep it simple and reliable

IMPORTANT: Use stepLogger.log('message') to track test progress. Example steps:
- stepLogger.log('Navigating to page')
- stepLogger.log('Page loaded')
- stepLogger.log('Found X buttons')
- stepLogger.log('Clicked submit button')
- stepLogger.log('Filled form field')
- stepLogger.log('Screenshot taken')

Example structure:
\`\`\`typescript
import { Page } from 'playwright';

export async function test(page: Page, baseUrl: string, screenshotPath: string, stepLogger: any) {
  stepLogger.log('Navigating to page');
  await page.goto(baseUrl + '/your-route', { waitUntil: 'networkidle' });

  stepLogger.log('Page loaded');
  await page.waitForLoadState('domcontentloaded');

  stepLogger.log('Taking screenshot');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  stepLogger.log('Test complete');
}
\`\`\``;
  }

  private escapePrompt(prompt: string): string {
    // Escape double quotes for shell command
    return prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
  }

  async refineTest(
    route: RouteInfo,
    originalCode: string,
    validation: ValidationResult
  ): Promise<string> {
    await this.checkCopilotCLI();

    const prompt = this.buildRefinePrompt(route, originalCode, validation);

    try {
      const command = `copilot -p "${this.escapePrompt(prompt)}" --allow-all-tools --deny-tool write`;

      const { stdout } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10,
        timeout: 60000,
      });

      if (!stdout || stdout.trim().length === 0) {
        Logger.warn('Copilot returned empty refinement, using original code');
        return originalCode;
      }

      const code = this.extractCode(stdout);

      if (!code || code.trim().length === 0) {
        Logger.warn('No code in refinement response, using original code');
        return originalCode;
      }

      return code;
    } catch (error) {
      Logger.warn(`Test refinement failed: ${(error as Error).message}, using original code`);
      return originalCode;
    }
  }

  private buildRefinePrompt(
    route: RouteInfo,
    originalCode: string,
    validation: ValidationResult
  ): string {
    let feedbackSection = '';

    if (validation.invalidSelectors.length > 0) {
      feedbackSection += `\nINVALID SELECTORS:\n`;
      validation.invalidSelectors.forEach((selector) => {
        feedbackSection += `- "${selector}" not found on page\n`;
      });
    }

    if (validation.validationErrors.length > 0) {
      feedbackSection += `\nVALIDATION ERRORS:\n`;
      validation.validationErrors.forEach((error) => {
        feedbackSection += `- ${error}\n`;
      });
    }

    if (validation.suggestedInteractions.length > 0) {
      feedbackSection += `\nDISCOVERED INTERACTIONS:\n`;
      validation.suggestedInteractions.forEach((interaction) => {
        feedbackSection += `- ${interaction.type}: ${interaction.description} (selector: ${interaction.selector})\n`;
      });
    }

    if (validation.pageStructure) {
      feedbackSection += `\nPAGE STRUCTURE:\n${validation.pageStructure}\n`;
    }

    return `Your generated test has been validated against the real page. Please refine it based on the feedback below.

ORIGINAL TEST CODE:
\`\`\`typescript
${originalCode}
\`\`\`

VALIDATION FEEDBACK:${feedbackSection}

Please update the test code to:
1. Fix any invalid selectors
2. Add interactions for discovered elements (if relevant)
3. Keep the same export signature: export async function test(page, baseUrl, screenshotPath, stepLogger)
4. Continue using stepLogger.log() for step tracking
5. Keep the test simple and reliable

Return ONLY the updated TypeScript code, no explanations.`;
  }

  private extractCode(text: string): string {
    // Extract code from markdown code blocks
    const codeBlockMatch = text.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, return the whole text
    return text.trim();
  }
}

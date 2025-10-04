import { RouteInfo, Config } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

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
      // Use copilot CLI in programmatic mode
      const command = `copilot -p "${this.escapePrompt(prompt)}"`;

      const { stdout } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10, // 10MB
        timeout: 60000, // 60 seconds
      });

      return this.extractCode(stdout);
    } catch (error) {
      throw new Error(
        `GitHub Copilot error: ${(error as Error).message}\n` +
          `Make sure you've:\n` +
          `1. Installed: npm install -g @github/copilot\n` +
          `2. Authenticated: Run 'copilot' and use /login command, or set GITHUB_TOKEN\n` +
          `3. Have an active Copilot subscription (Pro/Business/Enterprise)`
      );
    }
  }

  async testConnection(): Promise<void> {
    // Check CLI availability
    await this.checkCopilotCLI();

    try {
      // Test with a simple prompt
      const command = `copilot -p "hello"`;

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
      if (errorMsg.includes('not authenticated') || errorMsg.includes('login')) {
        throw new Error(
          `GitHub Copilot not authenticated. Please authenticate:\n` +
            `  Option 1: Run 'copilot' and use /login command\n` +
            `  Option 2: Set GITHUB_TOKEN environment variable`
        );
      }
      throw new Error(
        `GitHub Copilot connection failed: ${errorMsg}\n` +
          `Make sure you have an active Copilot subscription (Pro/Business/Enterprise)`
      );
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
2. Take a full-page screenshot
3. Check for basic page functionality (page loads, no console errors)
4. Use proper Playwright best practices
5. Make the test reusable for both live and dev environments
${this.config?.customTestInstructions ? `6. ${this.config.customTestInstructions}` : ''}

Return ONLY the TypeScript test code, no explanations. The test should:
- Import necessary Playwright modules
- Export a function called 'test' that accepts (page, baseUrl, screenshotPath)
- Navigate to baseUrl + route.path
- Wait for page to be fully loaded
${this.config?.customTestInstructions ? `- ${this.config.customTestInstructions}` : ''}
- Take a screenshot with proper naming
- Return screenshot path

Example structure:
\`\`\`typescript
import { Page } from '@playwright/test';

export async function test(page: Page, baseUrl: string, screenshotPath: string) {
  // Test implementation
}
\`\`\``;
  }

  private escapePrompt(prompt: string): string {
    // Escape double quotes for shell command
    return prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
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

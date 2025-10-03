import { RouteInfo } from '../types';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Claude Subscription Client
 * Uses Claude Agent SDK with Claude Pro/Max subscription
 * Requires: npm install -g @anthropic-ai/claude-code && claude login
 */
export class ClaudeSubscriptionClient {
  constructor() {
    // No API key needed - uses authenticated CLI
  }

  async generateTest(route: RouteInfo): Promise<string> {
    // Check if Claude CLI is available
    await this.checkClaudeCLI();

    const prompt = this.buildPrompt(route);

    try {
      // Use the SDK directly
      let responseText = '';

      for await (const message of query({ prompt })) {
        if (message.type === 'assistant') {
          // SDKAssistantMessage has a message property containing the API response
          const content = message.message.content;
          for (const block of content) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
        }
      }

      return this.extractCode(responseText);
    } catch (error) {
      throw new Error(
        `Claude subscription error: ${(error as Error).message}\n` +
          `Make sure you've run: npm install -g @anthropic-ai/claude-code && claude login`
      );
    }
  }

  async testConnection(): Promise<void> {
    // Check CLI availability and authentication
    await this.checkClaudeCLI();

    try {
      // Test with a simple query using SDK directly
      let hasResponse = false;

      for await (const message of query({ prompt: 'test' })) {
        if (message.type === 'assistant') {
          hasResponse = true;
          break;
        }
      }

      if (!hasResponse) {
        throw new Error('No response from Claude Agent SDK');
      }
    } catch (error) {
      throw new Error(
        `Claude subscription not authenticated. Please run: claude login\n` +
          `Error: ${(error as Error).message}`
      );
    }
  }

  private async checkClaudeCLI(): Promise<void> {
    try {
      await execAsync('claude --version');
    } catch (error) {
      throw new Error(
        'Claude CLI not found. Please install and authenticate:\n' +
          '1. npm install -g @anthropic-ai/claude-code\n' +
          '2. claude login'
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

Return ONLY the TypeScript test code, no explanations. The test should:
- Import necessary Playwright modules
- Export a function called 'test' that accepts (page, baseUrl, screenshotPath)
- Navigate to baseUrl + route.path
- Wait for page to be fully loaded
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

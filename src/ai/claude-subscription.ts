import { RouteInfo, Config } from '../types';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Claude Subscription Client
 * Uses Claude Agent SDK with Claude Pro/Max subscription
 * Requires: npm install -g @anthropic-ai/claude-code && claude login
 */
export class ClaudeSubscriptionClient {
  constructor(private config?: Config) {
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

      // Validate response
      if (!responseText || responseText.trim().length === 0) {
        const err = new Error('Claude returned an empty response');
        Logger.captureError(err, 'Claude test generation - empty response');
        throw err;
      }

      const code = this.extractCode(responseText);

      // Validate extracted code
      if (!code || code.trim().length === 0) {
        const err = new Error('Claude response did not contain valid TypeScript code');
        Logger.captureError(err, 'Claude test generation - no code extracted');
        throw err;
      }

      // Basic validation: check if it looks like TypeScript
      if (!code.includes('export') && !code.includes('function')) {
        const err = new Error('Claude response does not appear to contain a valid test function');
        Logger.captureError(err, 'Claude test generation - invalid code format');
        throw err;
      }

      return code;
    } catch (error) {
      // If error is already captured (from validation above), re-throw it
      if ((error as Error).message.includes('Claude returned an empty response') ||
          (error as Error).message.includes('did not contain valid TypeScript code') ||
          (error as Error).message.includes('does not appear to contain a valid test function')) {
        throw error;
      }

      // Otherwise, wrap and capture the error
      const err = new Error(
        `Claude subscription error: ${(error as Error).message}\n` +
          `Make sure you've run: npm install -g @anthropic-ai/claude-code && claude login`
      );
      Logger.captureError(err, 'Claude test generation');
      throw err;
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
      const err = new Error(
        `Claude subscription not authenticated. Please run: claude login\n` +
          `Error: ${(error as Error).message}`
      );
      Logger.captureError(err, 'Claude connection test');
      throw err;
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
    const basePrompt = `Generate a Playwright test for the following route:

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

    return basePrompt;
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

import { RouteInfo, Config } from '../types';
import { ValidationResult } from '../mcp-validator';
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

  async generateTest(route: RouteInfo, viewport?: { name: string; width: number; height: number }): Promise<string> {
    // Check if Claude CLI is available
    await this.checkClaudeCLI();

    const prompt = this.buildPrompt(route, viewport);

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

  private buildPrompt(route: RouteInfo, viewport?: { name: string; width: number; height: number }): string {
    let viewportContext = '';
    if (viewport) {
      viewportContext = `\nVIEWPORT CONTEXT:
- Testing on ${viewport.name} (${viewport.width}x${viewport.height})`;

      if (viewport.width < 768) {
        viewportContext += `
- This is a MOBILE viewport. Important considerations:
  * Verify touch targets are appropriately sized (min 44x44px)
  * Check for mobile-specific navigation (hamburger menus, mobile drawers)
  * Test scrolling behavior and fixed/sticky elements
  * Ensure forms are usable on small screens without horizontal scrolling
  * Verify responsive layout doesn't cause content overlap or cutoff
  * Look for mobile-specific UI patterns (bottom sheets, swipe gestures)
  * Check that tap areas don't overlap with other interactive elements`;
      } else {
        viewportContext += `
- This is a DESKTOP viewport. Important considerations:
  * Verify hover states and tooltips work correctly
  * Check desktop navigation patterns (dropdowns, mega menus)
  * Ensure wide-screen layouts utilize available space effectively`;
      }
    }

    const basePrompt = `Generate a Playwright test for the following route:

Route: ${route.path}
Type: ${route.type}
${route.filePath ? `File: ${route.filePath}` : ''}${viewportContext}

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

  async refineTest(
    route: RouteInfo,
    originalCode: string,
    validation: ValidationResult
  ): Promise<string> {
    await this.checkClaudeCLI();

    const prompt = this.buildRefinePrompt(route, originalCode, validation);

    try {
      let responseText = '';

      for await (const message of query({ prompt })) {
        if (message.type === 'assistant') {
          const content = message.message.content;
          for (const block of content) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
        }
      }

      if (!responseText || responseText.trim().length === 0) {
        Logger.warn('Claude returned empty refinement, using original code');
        return originalCode;
      }

      const code = this.extractCode(responseText);

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

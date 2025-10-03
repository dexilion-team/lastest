import inquirer from 'inquirer';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigManager } from '../config';
import { Logger } from '../utils/logger';
import { Scanner } from '../scanner';
import { TestGenerator } from '../generator';
import { TestRunner } from '../runner';
import { ReportGenerator } from '../reporter';
import { ClaudeClient } from '../ai/claude';
import { ClaudeSubscriptionClient } from '../ai/claude-subscription';
import { CopilotSubscriptionClient } from '../ai/copilot-subscription';
import { Config } from '../types';

const execAsync = promisify(exec);

interface InitOptions {
  config?: string;
  live?: string;
  dev?: string;
  scan?: string;
  ai?: string;
}

export async function initCommand(options: InitOptions) {
  // ASCII art jumping lion
  console.log(`
     /\\_/\\
    ( o.o )
     > ^ <   |\\_/|
    /|   |\\ ( o.o )
   (_|   |_) > ^ <
      | |   /     \\
      |_|  /_______\\
  `);

  Logger.title('🚀 lastest - Automated Visual Testing');

  // Step 0: Ensure Playwright is installed
  Logger.newLine();
  await ensurePlaywrightInstalled();

  // Load existing config or create new one
  let config = await ConfigManager.load();

  if (!config) {
    Logger.newLine();
    config = await promptForConfig(options);
    await ConfigManager.save(config);
    Logger.newLine();
    Logger.success('Configuration saved to .lastestrc.json');
  } else {
    Logger.info('Using existing configuration from .lastestrc.json');

    // Override with CLI options if provided
    if (options.live) config.liveUrl = options.live;
    if (options.dev) config.devUrl = options.dev;
    if (options.scan) config.scanPath = options.scan;
    if (options.ai)
      config.aiProvider = options.ai as 'claude-api' | 'claude-subscription' | 'copilot-subscription';

    // Verify existing config
    Logger.newLine();
    Logger.step('Verifying AI setup...');
    const isValid = await verifyAISetup(config);

    if (!isValid) {
      Logger.warn('Existing AI setup is invalid. Let\'s reconfigure...');
      Logger.newLine();
      config = await promptForConfig(options);
      await ConfigManager.save(config);
      Logger.newLine();
      Logger.success('Configuration updated');
    } else {
      Logger.success('AI setup verified!');
    }
  }

  // Step 1: Scan codebase for routes
  Logger.newLine();
  Logger.step('Scanning codebase for routes...');
  const scanner = new Scanner(config.scanPath);
  const routes = await scanner.scan();
  Logger.success(`Found ${routes.length} routes to test`);

  // Step 2: Generate tests using AI
  Logger.newLine();
  Logger.step('Generating tests using AI...');
  const generator = new TestGenerator(config);
  const tests = await generator.generateTests(routes);
  Logger.success(`Generated ${tests.length} test cases`);

  // Step 3: Run tests against both environments
  Logger.newLine();
  Logger.step('Running tests...');
  const runner = new TestRunner(config);
  const results = await runner.runTests(tests);
  Logger.success(`Completed ${results.length} tests`);

  // Step 4: Generate report
  Logger.newLine();
  Logger.step('Generating report...');
  const reporter = new ReportGenerator(config);
  const reportPath = await reporter.generate(results);

  Logger.newLine();
  Logger.success('Testing complete!');
  Logger.highlight(`Report: ${reportPath}`);
  Logger.dim(`Screenshots: ${path.join(config.outputDir, 'screenshots')}`);
  Logger.dim(`Diffs: ${path.join(config.outputDir, 'diffs')}`);
}

async function verifyAISetup(config: Config): Promise<boolean> {
  try {
    switch (config.aiProvider) {
      case 'claude-api':
        if (!config.claudeApiKey) {
          throw new Error('Claude API key is required');
        }
        const claudeClient = new ClaudeClient(config.claudeApiKey);
        await claudeClient.testConnection();
        break;

      case 'claude-subscription':
        const claudeSubClient = new ClaudeSubscriptionClient();
        await claudeSubClient.testConnection();
        break;

      case 'copilot-subscription':
        const copilotClient = new CopilotSubscriptionClient();
        await copilotClient.testConnection();
        break;

      default:
        throw new Error(`Unknown AI provider: ${config.aiProvider}`);
    }
    return true;
  } catch (error) {
    Logger.error((error as Error).message);
    return false;
  }
}

async function ensurePlaywrightInstalled(): Promise<void> {
  Logger.step('Checking Playwright installation...');

  try {
    // Check if playwright is installed
    await execAsync('npx playwright --version', { timeout: 5000 });
    Logger.success('Playwright is installed');
  } catch (error) {
    Logger.warn('Playwright not installed. Installing Chromium browser...');

    try {
      const { execSync } = require('child_process');
      execSync('npx playwright install chromium', {
        stdio: 'inherit',
      });
      Logger.success('Playwright installed successfully');
    } catch (installError) {
      Logger.error('Failed to install Playwright automatically');
      throw new Error(
        'Please install Playwright manually:\n  npx playwright install chromium'
      );
    }
  }
}

async function getConfigAnswers(options: InitOptions) {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'aiProvider',
      message: 'Which AI provider would you like to use?',
      choices: [
        { name: 'Claude API - Pay per use (requires API key)', value: 'claude-api' },
        {
          name: 'Claude Subscription - Use existing Pro/Max plan (free with subscription)',
          value: 'claude-subscription',
        },
        {
          name: 'GitHub Copilot - Use existing Copilot subscription (free with subscription)',
          value: 'copilot-subscription',
        },
      ],
      default: options.ai || 'claude-api',
    },
    {
      type: 'password',
      name: 'claudeApiKey',
      message: 'Enter your Claude API key:',
      when: (answers) => answers.aiProvider === 'claude-api',
      validate: (input) => input.length > 0 || 'API key is required',
    },
    {
      type: 'confirm',
      name: 'claudeSubscriptionSetup',
      message:
        'Have you installed and authenticated Claude CLI?\n' +
        '  Run: npm install -g @anthropic-ai/claude-code && claude login',
      when: (answers) => answers.aiProvider === 'claude-subscription',
      default: false,
    },
    {
      type: 'confirm',
      name: 'copilotSubscriptionSetup',
      message:
        'Have you installed and authenticated GitHub Copilot CLI?\n' +
        '  Run: npm install -g @github/copilot-cli\n' +
        '  Then authenticate with: copilot (use /login) or gh auth login',
      when: (answers) => answers.aiProvider === 'copilot-subscription',
      default: false,
    },
    {
      type: 'input',
      name: 'scanPath',
      message: 'Path to scan for routes:',
      default: options.scan || '.',
      validate: (input) => input.length > 0 || 'Path is required',
    },
    {
      type: 'input',
      name: 'liveUrl',
      message: 'Live URL:',
      default: options.live,
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
    {
      type: 'input',
      name: 'devUrl',
      message: 'Development URL:',
      default: options.dev,
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
  ]);

  return answers;
}

async function promptForConfig(options: InitOptions): Promise<Config> {
  let configValid = false;
  let config: Config | null = null;

  while (!configValid) {
    // Get config from user
    const answers = await getConfigAnswers(options);
    const defaults = ConfigManager.getDefaultConfig();

    config = {
      ...defaults,
      ...answers,
    } as Config;

    // Test AI setup
    Logger.newLine();
    Logger.step('Testing AI setup...');
    const isValid = await verifyAISetup(config);

    if (isValid) {
      Logger.success('AI setup verified!');
      configValid = true;
    } else {
      Logger.newLine();
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to reconfigure?',
          default: true,
        },
      ]);

      if (!retry) {
        throw new Error('AI setup verification failed. Exiting.');
      }

      Logger.newLine();
      Logger.info('Let\'s try again...');
      Logger.newLine();
    }
  }

  return config!;
}

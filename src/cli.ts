#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { runCommand } from './commands/run';
import { Logger } from './utils/logger';

const program = new Command();

program
  .name('lasTest')
  .description('AI-powered automated visual testing CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize lasTest configuration and run visual tests')
  .option('-c, --config <path>', 'Path to config file')
  .option('--live <url>', 'Live URL to test')
  .option('--dev <url>', 'Development URL to test')
  .option('--scan <path>', 'Path to scan for routes')
  .option('--ai <provider>', 'AI provider (claude or copilot)')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      Logger.error(`Failed to initialize: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Default action when running `lastest` without a command
program
  .action(async () => {
    try {
      await runCommand();
    } catch (error) {
      Logger.error(`Failed to run tests: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();

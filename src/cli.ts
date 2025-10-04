#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { runCommand } from './commands/run';
import { Logger } from './utils/logger';
import { ErrorLogger } from './utils/error-logger';
import inquirer from 'inquirer';
import { exec } from 'child_process';

const program = new Command();

program
  .name('lasTest')
  .description('AI-powered automated visual testing CLI')
  .version('0.1.0');

async function handleError(error: Error, context: string) {
  Logger.captureError(error, context);

  if (ErrorLogger.hasErrors()) {
    Logger.newLine();
    const { sendReport } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'sendReport',
        message: 'Would you like to send an error report to help improve lasTest?',
        default: false,
      },
    ]);

    if (sendReport) {
      const mailtoLink = ErrorLogger.getMailtoLink();
      Logger.info('Opening email client with error report...');

      // Determine the command based on platform
      const platform = process.platform;
      let command: string;

      if (platform === 'darwin') {
        command = `open "${mailtoLink}"`;
      } else if (platform === 'win32') {
        command = `start "${mailtoLink}"`;
      } else {
        // Linux and others
        command = `xdg-open "${mailtoLink}"`;
      }

      exec(command, (err) => {
        if (err) {
          Logger.warn('Could not open email client automatically');
          Logger.info('Please copy this mailto link:');
          Logger.highlight(mailtoLink);
        }
      });
    }
  }

  process.exit(1);
}

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
      await handleError(error as Error, 'Failed to initialize');
    }
  });

// Default action when running `lastest` without a command
program
  .action(async () => {
    try {
      await runCommand();
    } catch (error) {
      await handleError(error as Error, 'Failed to run tests');
    }
  });

program.parse();

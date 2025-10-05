#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { runCommand } from './commands/run';
import { Logger } from './utils/logger';
import { ErrorLogger } from './utils/error-logger';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import * as fs from 'fs';

const program = new Command();

program
  .name('lasTest')
  .description('AI-powered automated visual testing CLI')
  .version('0.1.0');

export async function promptForErrorReport(): Promise<void> {
  if (ErrorLogger.hasErrors()) {
    Logger.newLine();
    const { sendReport } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'sendReport',
        message: 'I see you ran into some problems. Would you mind sending them over so we can fix them?',
        default: true,
      },
    ]);

    if (sendReport) {
      const mailtoLink = ErrorLogger.getMailtoLink();

      // Check if URL is too long (most mail clients have limits around 2000 chars)
      if (mailtoLink.length > 2000) {
        Logger.warn('Error report too long for automatic email opening');
        Logger.info('Please copy this mailto link and paste it in your browser:');
        Logger.highlight(mailtoLink);
        return;
      }

      Logger.info('Opening email client with error report...');
      Logger.dim('Or send over the error details to lastest@dexilion.com');

      // Detect WSL2 environment
      const platform = process.platform;
      const isWSL = platform === 'linux' &&
                    fs.existsSync('/proc/version') &&
                    fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');

      let command: string;

      if (isWSL) {
        // WSL: Use Windows command to open mail client
        // Note: The empty quotes after start are for the window title
        command = `cmd.exe /c start "" "${mailtoLink}"`;
      } else if (platform === 'darwin') {
        command = `open "${mailtoLink}"`;
      } else if (platform === 'win32') {
        command = `start "" "${mailtoLink}"`;
      } else {
        // Native Linux
        command = `xdg-open "${mailtoLink}"`;
      }

      exec(command, (err) => {
        if (err) {
          Logger.warn('Could not open email client automatically');
          Logger.info('Please copy this mailto link:');
          Logger.highlight(mailtoLink);
        } else {
          Logger.dim('Email client opened successfully');
        }
      });
    }
  }
}

async function handleError(error: Error, context: string) {
  Logger.captureError(error, context);
  await promptForErrorReport();
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

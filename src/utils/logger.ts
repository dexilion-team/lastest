import chalk from 'chalk';
import { ErrorLogger } from './error-logger';

export class Logger {
  static info(message: string) {
    console.log(chalk.blue('ℹ'), message);
  }

  static success(message: string) {
    console.log(chalk.green('✓'), message);
  }

  static error(message: string) {
    console.log(chalk.red('✗'), message);
  }

  static warn(message: string) {
    console.log(chalk.yellow('⚠'), message);
  }

  static step(message: string) {
    console.log(chalk.cyan('→'), message);
  }

  static title(message: string) {
    console.log('\n' + chalk.bold.magenta(message) + '\n');
  }

  static dim(message: string) {
    console.log(chalk.dim(message));
  }

  static highlight(message: string) {
    console.log(chalk.bold.white(message));
  }

  static welcome() {
    const art = [
      '╔═══════════════════════════════════════════════════════════════════════════╗',
      '║                   █████████████████████████████████████████████████████╗  ║',
      '║                   ╚════════════════════════██╔═════════════════════════╝  ║',
      '║                   ██╗      █████╗ ███████╗ ██║ ███████╗███████╗████████╗  ║',
      '║   /\\_/\\           ██║     ██╔══██╗██╔════╝ ██║ ██╔════╝██╔════╝╚══██╔══╝  ║',
      '║  ( o.o )          ██║     ███████║███████╗ ██║ █████╗  ███████╗   ██║     ║',
      '║   > ^ <   |\\_/|   ██║     ██╔══██║╚════██║ ██║ ██╔══╝  ╚════██║   ██║     ║',
      '║  /|   |\\ ( o.o )  ███████╗██║  ██║███████║ ██║ ███████╗███████║   ██║     ║',
      '║ (_|   |_) > ^ <   ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═╝ ╚══════╝╚══════╝   ╚═╝     ║',
      '║    | |   /     \\                                                          ║',
      '║    |_|  /_______\\                               Automated Visual Testing  ║',
      '║                                                         made by Dexilion  ║',
      '║                                                             dexilion.com  ║',
      '║                                                                   v0.1.0  ║',
      '╚═══════════════════════════════════════════════════════════════════════════╝'
    ];

    console.log('\n' + art.map(line => chalk.magenta(line)).join('\n') + '\n');
  }

  static spinner(message: string) {
    process.stdout.write(chalk.cyan('⠋ ') + message);
  }

  static clearLine() {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  static newLine() {
    console.log('');
  }

  /**
   * Capture and log an error with context
   */
  static captureError(error: Error, context?: string) {
    ErrorLogger.captureError(error, context);
    this.error(`${context ? context + ': ' : ''}${error.message}`);
  }
}

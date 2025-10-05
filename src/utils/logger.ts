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

  static checking(name: string) {
    console.log(chalk.cyan('⋯'), `Checking ${name}...`);
  }

  static installed(name: string) {
    console.log(chalk.green('✓'), `${name} installed`);
  }

  static notInstalled(name: string) {
    console.log(chalk.yellow('⚠'), `${name} not installed (will install later)`);
  }

  static welcome() {
    const art = [
      '╔═══════════════════════════════════════════════════════════════════════════╗',
      '║   /\\_/\\           █████████████████████████████████████████████████████╗  ║',
      '║  ( o.o )          ╚════════════════════════██╔═════════════════════════╝  ║',
      '║   > ^ <   |\\_/|   ██╗      █████╗ ███████╗ ██║ ███████╗███████╗████████╗  ║',
      '║  /|   |\\ ( o.o )  ██║     ██╔══██╗██╔════╝ ██║ ██╔════╝██╔════╝╚══██╔══╝  ║',
      '║ (_|   |_) > ^ <   ██║     ███████║███████╗ ██║ █████╗  ███████╗   ██║     ║',
      '║    | |   /     \\  ██║     ██╔══██║╚════██║ ██║ ██╔══╝  ╚════██║   ██║     ║',
      '║    |_|  /_______\\ ███████╗██║  ██║███████║ ██║ ███████╗███████║   ██║     ║',
      '║                   ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═╝ ╚══════╝╚══════╝   ╚═╝     ║',
      '║                                                                           ║',
      '║                                                 Automated Visual Testing  ║',
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

  /**
   * Display test results summary with environment stats
   */
  static testSummary(environmentStats: {
    live: { total: number; passed: number; failed: number };
    dev: { total: number; passed: number; failed: number };
  }, pixelShiftsCount: number, differencesCount: number) {
    const passIcon = chalk.green('✓');
    const failIcon = chalk.red('✗');
    const pixelShiftIcon = chalk.dim('≈');
    const diffIcon = chalk.yellow('⚠');

    const summary = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║                    TEST RESULTS SUMMARY                      ║',
      '╠══════════════════════════════════════════════════════════════╣',
      `║  Live Environment:   ${passIcon} ${environmentStats.live.passed}/${environmentStats.live.total} passed  ${failIcon} ${environmentStats.live.failed}/${environmentStats.live.total} failed   ║`,
      `║  Dev Environment:    ${passIcon} ${environmentStats.dev.passed}/${environmentStats.dev.total} passed  ${failIcon} ${environmentStats.dev.failed}/${environmentStats.dev.total} failed   ║`,
      '║                                                              ║',
      `║  Visual Comparison:  ${pixelShiftIcon} ${pixelShiftsCount} pixel shift${pixelShiftsCount !== 1 ? 's' : ''}  ${diffIcon} ${differencesCount} difference${differencesCount !== 1 ? 's' : ''}   ║`,
      '╚══════════════════════════════════════════════════════════════╝'
    ];

    console.log('\n' + summary.join('\n') + '\n');
  }
}

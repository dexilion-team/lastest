import { ConfigManager } from '../config';
import { Logger } from '../utils/logger';
import { Scanner } from '../scanner';
import { TestGenerator } from '../generator';
import { TestRunner } from '../runner';
import { ReportGenerator } from '../reporter';
import * as path from 'path';

/**
 * Run command - executes tests with existing configuration
 */
export async function runCommand() {
  Logger.title('🚀 lastest - Automated Visual Testing');

  // Load existing config
  Logger.newLine();
  Logger.step('Loading configuration...');
  const config = await ConfigManager.load();

  if (!config) {
    Logger.error('No configuration found. Please run: lastest init');
    Logger.dim('This will create a .lastestrc.json file in the current directory.');
    process.exit(1);
  }

  Logger.success('Configuration loaded from .lastestrc.json');

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

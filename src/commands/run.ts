import { ConfigManager } from '../config';
import { TestCache } from '../test-cache';
import { Logger } from '../utils/logger';
import { TestRunner } from '../runner';
import { ReportGenerator } from '../reporter';
import * as path from 'path';

/**
 * Run command - executes tests with existing configuration and cached tests
 */
export async function runCommand() {
  Logger.title('🚀 lasTest - Automated Visual Testing');

  // Load existing config
  Logger.newLine();
  Logger.step('Loading configuration...');
  const config = await ConfigManager.load();

  if (!config) {
    Logger.error('No configuration found. Please run: lasTest init');
    Logger.dim('This will create a .lastestrc.json file in the current directory.');
    process.exit(1);
  }

  Logger.success('Configuration loaded from .lastestrc.json');

  // Load cached tests
  Logger.newLine();
  Logger.step('Loading cached tests...');
  const tests = await TestCache.load();

  if (!tests || tests.length === 0) {
    Logger.error('No cached tests found. Please run: lasTest init');
    Logger.dim('This will scan your codebase and generate tests using AI.');
    process.exit(1);
  }

  Logger.success(`Loaded ${tests.length} test cases from cache`);

  // Run tests against both environments
  Logger.newLine();
  Logger.step('Running tests...');
  const runner = new TestRunner(config);
  const results = await runner.runTests(tests);
  Logger.success(`Completed ${results.length} tests`);

  // Generate report
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

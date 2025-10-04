import { ConfigManager } from '../config';
import { TestCache } from '../test-cache';
import { Logger } from '../utils/logger';
import { ErrorLogger } from '../utils/error-logger';
import { TestRunner } from '../runner';
import { ReportGenerator } from '../reporter';
import { initCommand } from './init';
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
    Logger.warn('No configuration found. Running initialization...');
    Logger.newLine();
    await initCommand({});
    return;
  }

  Logger.success('Configuration loaded from .lastestrc.json');

  // Set config for error logging
  ErrorLogger.setConfig(config);

  // Load cached tests
  Logger.newLine();
  Logger.step('Loading cached tests...');
  const tests = await TestCache.load();

  if (!tests || tests.length === 0) {
    Logger.warn('No cached tests found. Running initialization...');
    Logger.newLine();
    await initCommand({});
    return;
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

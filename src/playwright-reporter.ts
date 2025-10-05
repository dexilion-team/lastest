import * as fs from 'fs-extra';
import * as path from 'path';
import { TestResult } from './types';

/**
 * Playwright-compatible test result format
 */
interface PlaywrightTestResult {
  title: string;
  file: string;
  line: number;
  column: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  retry: number;
  errors: Array<{
    message: string;
    stack?: string;
  }>;
  attachments: Array<{
    name: string;
    path: string;
    contentType: string;
  }>;
  steps?: Array<{
    title: string;
    duration: number;
    error?: string;
    status?: 'passed' | 'failed';
  }>;
}

interface PlaywrightSuite {
  title: string;
  file: string;
  line: number;
  column: number;
  suites: PlaywrightSuite[];
  tests: PlaywrightTestResult[];
}

interface PlaywrightReport {
  config: {
    rootDir: string;
    workers: number;
  };
  suites: PlaywrightSuite[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
}

export class PlaywrightReporter {
  constructor(private outputDir: string) {}

  /**
   * Generate a Playwright-compatible JSON report from test results
   */
  async generateReport(results: TestResult[], liveUrl: string, devUrl: string): Promise<string> {
    const reportDir = path.join(this.outputDir, 'playwright-report');
    await fs.ensureDir(reportDir);

    // Group results by environment
    const liveResults = results.filter(r => r.environment === 'live');
    const devResults = results.filter(r => r.environment === 'dev');

    // Create Playwright-compatible report structure
    const report: PlaywrightReport = {
      config: {
        rootDir: process.cwd(),
        workers: 1,
      },
      suites: [
        this.createSuite('Live Environment', liveResults, liveUrl),
        this.createSuite('Dev Environment', devResults, devUrl),
      ],
      stats: this.calculateStats(results),
    };

    // Write report.json
    const reportPath = path.join(reportDir, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML from JSON using Playwright's reporter
    await this.generateHtml(reportDir, reportPath);

    return reportDir;
  }

  private createSuite(title: string, results: TestResult[], baseUrl: string): PlaywrightSuite {
    return {
      title,
      file: '',
      line: 0,
      column: 0,
      suites: [],
      tests: results.map(result => this.convertToPlaywrightTest(result, baseUrl)),
    };
  }

  private convertToPlaywrightTest(result: TestResult, baseUrl: string): PlaywrightTestResult {
    const testTitle = `${result.route} - ${baseUrl}`;

    // Convert absolute screenshot path to relative path from playwright-report directory
    const screenshotRelativePath = path.relative(
      path.join(this.outputDir, 'playwright-report'),
      result.screenshot
    );

    return {
      title: testTitle,
      file: result.detailedResults?.testName || result.route,
      line: 0,
      column: 0,
      status: result.passed ? 'passed' : 'failed',
      duration: result.duration,
      retry: result.detailedResults?.retries || 0,
      errors: result.error ? [{
        message: result.error,
        stack: result.detailedResults?.error?.stack,
      }] : [],
      attachments: [{
        name: 'screenshot',
        path: screenshotRelativePath,
        contentType: 'image/png',
      }],
      steps: result.detailedResults?.steps || [],
    };
  }

  private calculateStats(results: TestResult[]) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const startTime = new Date().toISOString();
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      startTime,
      duration: totalDuration,
      expected: passed,
      unexpected: failed,
      flaky: 0,
      skipped: 0,
    };
  }

  private async generateHtml(reportDir: string, jsonPath: string): Promise<void> {
    // Read the JSON data to embed it directly in the HTML
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const html = this.buildHtmlViewer(jsonData);
    const htmlPath = path.join(reportDir, 'index.html');
    await fs.writeFile(htmlPath, html);
  }

  private buildHtmlViewer(jsonData: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playwright Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 5px;
    }

    .meta {
      opacity: 0.9;
      font-size: 14px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      padding: 30px;
      border-bottom: 1px solid #e0e0e0;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }

    .stat.passed .stat-value {
      color: #10b981;
    }

    .stat.failed .stat-value {
      color: #ef4444;
    }

    .suite {
      border-bottom: 1px solid #e0e0e0;
    }

    .suite-header {
      background: #f9fafb;
      padding: 20px 30px;
      font-weight: 600;
      font-size: 18px;
      color: #374151;
    }

    .test-list {
      padding: 0;
    }

    .test-item {
      padding: 20px 30px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .test-item:last-child {
      border-bottom: none;
    }

    .test-item.passed {
      background: #f0fdf4;
    }

    .test-item.failed {
      background: #fef2f2;
    }

    .test-title {
      flex: 1;
      font-size: 14px;
    }

    .test-status {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }

    .status-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
    }

    .status-icon.passed {
      background: #10b981;
      color: white;
    }

    .status-icon.failed {
      background: #ef4444;
      color: white;
    }

    .duration {
      color: #6b7280;
      font-size: 13px;
    }

    .error-details {
      margin-top: 10px;
      padding: 15px;
      background: #fee;
      border-left: 4px solid #ef4444;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      color: #991b1b;
    }

    .screenshot-link {
      margin-top: 10px;
    }

    .screenshot-link a {
      color: #3b82f6;
      text-decoration: none;
      font-size: 13px;
    }

    .screenshot-link a:hover {
      text-decoration: underline;
    }

    .test-steps {
      margin-top: 15px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }

    .steps-header {
      font-weight: 600;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      margin: 4px 0;
      background: white;
      border-radius: 4px;
      font-size: 13px;
    }

    .step-item.passed {
      border-left: 3px solid #10b981;
    }

    .step-item.failed {
      border-left: 3px solid #ef4444;
      background: #fef2f2;
    }

    .step-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .step-item.passed .step-icon {
      background: #10b981;
      color: white;
    }

    .step-item.failed .step-icon {
      background: #ef4444;
      color: white;
    }

    .step-title {
      flex: 1;
      color: #374151;
    }

    .step-duration {
      color: #9ca3af;
      font-size: 11px;
      flex-shrink: 0;
    }

    .step-error {
      width: 100%;
      margin-top: 6px;
      padding: 8px;
      background: #fee;
      border-radius: 3px;
      font-size: 11px;
      color: #991b1b;
      font-family: monospace;
    }

    footer {
      padding: 20px;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container" id="app">
    <header>
      <h1>🎭 Playwright Test Report</h1>
      <div class="meta">Loading test results...</div>
    </header>
    <div id="content"></div>
    <footer>Generated by lasTest</footer>
  </div>

  <script>
    // Embed report data directly to avoid CORS issues
    const REPORT_DATA = ${jsonData};

    function loadReport() {
      try {
        renderReport(REPORT_DATA);
      } catch (error) {
        document.getElementById('content').innerHTML =
          '<div style="padding: 30px; color: #ef4444;">Error loading report: ' + error.message + '</div>';
      }
    }

    function renderReport(data) {
      const meta = document.querySelector('.meta');
      meta.textContent = 'Generated: ' + new Date(data.stats.startTime).toLocaleString() +
                         ' | Duration: ' + (data.stats.duration / 1000).toFixed(2) + 's';

      const statsHtml = \`
        <div class="stats">
          <div class="stat">
            <div class="stat-value">\${data.stats.expected + data.stats.unexpected}</div>
            <div class="stat-label">Total Tests</div>
          </div>
          <div class="stat passed">
            <div class="stat-value">\${data.stats.expected}</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat failed">
            <div class="stat-value">\${data.stats.unexpected}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat">
            <div class="stat-value">\${data.stats.skipped}</div>
            <div class="stat-label">Skipped</div>
          </div>
        </div>
      \`;

      const suitesHtml = data.suites.map(suite => renderSuite(suite)).join('');

      document.getElementById('content').innerHTML = statsHtml + suitesHtml;
    }

    function renderSuite(suite) {
      const testsHtml = suite.tests.map(test => renderTest(test)).join('');

      return \`
        <div class="suite">
          <div class="suite-header">\${suite.title}</div>
          <div class="test-list">
            \${testsHtml}
          </div>
        </div>
      \`;
    }

    function renderTest(test) {
      const statusClass = test.status === 'passed' ? 'passed' : 'failed';
      const statusIcon = test.status === 'passed' ? '✓' : '✗';
      const errorHtml = test.errors.length > 0 ?
        '<div class="error-details">' + test.errors.map(e => e.message).join('\\n') + '</div>' : '';
      const screenshotHtml = test.attachments.length > 0 ?
        '<div class="screenshot-link"><a href="' + test.attachments[0].path + '" target="_blank">📸 View Screenshot</a></div>' : '';

      // Render steps if available
      const stepsHtml = test.steps && test.steps.length > 0 ?
        '<div class="test-steps">' +
        '<div class="steps-header">Steps:</div>' +
        test.steps.map(step => {
          const stepStatus = step.error ? 'failed' : 'passed';
          const stepIcon = step.error ? '✗' : '✓';
          return \`
            <div class="step-item \${stepStatus}">
              <span class="step-icon">\${stepIcon}</span>
              <span class="step-title">\${step.title}</span>
              <span class="step-duration">\${(step.duration / 1000).toFixed(2)}s</span>
              \${step.error ? '<div class="step-error">' + step.error + '</div>' : ''}
            </div>
          \`;
        }).join('') +
        '</div>' : '';

      return \`
        <div class="test-item \${statusClass}">
          <div style="flex: 1;">
            <div class="test-title">\${test.title}</div>
            \${stepsHtml}
            \${errorHtml}
            \${screenshotHtml}
          </div>
          <div class="test-status">
            <span class="duration">\${(test.duration / 1000).toFixed(2)}s</span>
            <div class="status-icon \${statusClass}">\${statusIcon}</div>
          </div>
        </div>
      \`;
    }

    loadReport();
  </script>
</body>
</html>
    `.trim();
  }
}

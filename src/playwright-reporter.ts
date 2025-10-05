import * as fs from 'fs-extra';
import * as path from 'path';
import { TestResult } from './types';

export class PlaywrightReporter {
  constructor(private outputDir: string) {}

  /**
   * Generate a Playwright-compatible JSON report from test results
   */
  async generateReport(results: TestResult[], liveUrl: string, devUrl: string): Promise<string> {
    const reportDir = path.join(this.outputDir, 'playwright-report');
    await fs.ensureDir(reportDir);

    // Group results by route for side-by-side comparison
    const routeGroups = this.groupResultsByRoute(results);

    // Generate HTML with live/dev comparison
    await this.generateHtml(reportDir, routeGroups, liveUrl, devUrl, results);

    return reportDir;
  }

  private groupResultsByRoute(results: TestResult[]): Map<string, { live?: TestResult; dev?: TestResult }> {
    const routeGroups = new Map<string, { live?: TestResult; dev?: TestResult }>();

    for (const result of results) {
      if (!routeGroups.has(result.route)) {
        routeGroups.set(result.route, {});
      }
      const group = routeGroups.get(result.route)!;
      if (result.environment === 'live') {
        group.live = result;
      } else {
        group.dev = result;
      }
    }

    return routeGroups;
  }

  private async generateHtml(
    reportDir: string,
    routeGroups: Map<string, { live?: TestResult; dev?: TestResult }>,
    liveUrl: string,
    devUrl: string,
    allResults: TestResult[]
  ): Promise<void> {
    const html = this.buildHtmlViewer(routeGroups, liveUrl, devUrl, allResults);
    const htmlPath = path.join(reportDir, 'index.html');
    await fs.writeFile(htmlPath, html);
  }

  private buildHtmlViewer(
    routeGroups: Map<string, { live?: TestResult; dev?: TestResult }>,
    liveUrl: string,
    devUrl: string,
    allResults: TestResult[]
  ): string {
    const timestamp = new Date().toISOString();
    const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);

    // Convert route groups to JSON for embedding
    const routeData = Array.from(routeGroups.entries()).map(([route, { live, dev }]) => ({
      route,
      live: live ? this.convertResultToJson(live) : null,
      dev: dev ? this.convertResultToJson(dev) : null,
    }));

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Step-by-Step Comparison</title>
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
      max-width: 1600px;
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

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
    }

    .comparison-table th {
      background: #f9fafb;
      padding: 15px;
      text-align: left;
      border-bottom: 2px solid #e0e0e0;
      font-weight: 600;
      color: #374151;
    }

    .comparison-table td {
      padding: 20px 15px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }

    .route-name {
      font-family: monospace;
      font-size: 14px;
      color: #374151;
      font-weight: 600;
      width: 200px;
    }

    .env-column {
      width: 45%;
    }

    .env-result {
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
    }

    .env-result.passed {
      background: #f0fdf4;
    }

    .env-result.failed {
      background: #fef2f2;
    }

    .env-result.missing {
      background: #f3f4f6;
      color: #6b7280;
      text-align: center;
      padding: 20px;
    }

    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    .status-badge.passed {
      color: #166534;
    }

    .status-badge.failed {
      color: #991b1b;
    }

    .status-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
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

    .test-steps {
      margin-top: 10px;
    }

    .steps-header {
      font-weight: 600;
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 10px;
      margin: 3px 0;
      background: white;
      border-radius: 4px;
      font-size: 12px;
    }

    .step-item.passed {
      border-left: 3px solid #10b981;
    }

    .step-item.failed {
      border-left: 3px solid #ef4444;
      background: #fef2f2;
    }

    .step-icon {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-item.passed .step-icon {
      background: #10b981;
      color: white;
    }

    .step-item.failed .step-icon {
      background: #ef4444;
      color: white;
    }

    .step-content {
      flex: 1;
    }

    .step-title {
      color: #374151;
      line-height: 1.4;
    }

    .step-duration {
      color: #9ca3af;
      font-size: 10px;
      margin-left: auto;
      flex-shrink: 0;
      padding-left: 8px;
    }

    .step-error {
      margin-top: 4px;
      padding: 6px 8px;
      background: #fee;
      border-radius: 3px;
      font-size: 11px;
      color: #991b1b;
      font-family: monospace;
    }

    .error-details {
      margin-top: 10px;
      padding: 10px;
      background: #fee;
      border-left: 3px solid #ef4444;
      font-family: monospace;
      font-size: 11px;
      color: #991b1b;
      border-radius: 3px;
    }

    .screenshot-link {
      margin-top: 10px;
    }

    .screenshot-link a {
      color: #3b82f6;
      text-decoration: none;
      font-size: 12px;
    }

    .screenshot-link a:hover {
      text-decoration: underline;
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
  <div class="container">
    <header>
      <h1>📊 Step-by-Step Comparison</h1>
      <div class="meta">
        Generated: ${new Date(timestamp).toLocaleString()} |
        Duration: ${(totalDuration / 1000).toFixed(2)}s
      </div>
    </header>

    <table class="comparison-table">
      <thead>
        <tr>
          <th class="route-name">Route</th>
          <th class="env-column">Live Environment</th>
          <th class="env-column">Dev Environment</th>
        </tr>
      </thead>
      <tbody id="results-body">
      </tbody>
    </table>

    <footer>Generated by lasTest</footer>
  </div>

  <script>
    const ROUTE_DATA = ${JSON.stringify(routeData)};

    function renderResults() {
      const tbody = document.getElementById('results-body');

      ROUTE_DATA.forEach(({ route, live, dev }) => {
        const row = document.createElement('tr');

        // Route column
        const routeCell = document.createElement('td');
        routeCell.className = 'route-name';
        routeCell.textContent = route;
        row.appendChild(routeCell);

        // Live environment column
        const liveCell = document.createElement('td');
        liveCell.className = 'env-column';
        liveCell.innerHTML = renderEnvironmentResult(live, '${liveUrl}');
        row.appendChild(liveCell);

        // Dev environment column
        const devCell = document.createElement('td');
        devCell.className = 'env-column';
        devCell.innerHTML = renderEnvironmentResult(dev, '${devUrl}');
        row.appendChild(devCell);

        tbody.appendChild(row);
      });
    }

    function renderEnvironmentResult(result, baseUrl) {
      if (!result) {
        return '<div class="env-result missing">No data</div>';
      }

      const statusClass = result.passed ? 'passed' : 'failed';
      const statusIcon = result.passed ? '✓' : '✗';

      const stepsHtml = result.steps && result.steps.length > 0 ?
        \`<div class="test-steps">
          <div class="steps-header">Steps:</div>
          \${result.steps.map(step => {
            const stepStatus = step.error ? 'failed' : 'passed';
            const stepIcon = step.error ? '✗' : '✓';
            return \`
              <div class="step-item \${stepStatus}">
                <span class="step-icon">\${stepIcon}</span>
                <div class="step-content">
                  <div style="display: flex; align-items: center;">
                    <span class="step-title">\${step.title}</span>
                    <span class="step-duration">\${(step.duration / 1000).toFixed(2)}s</span>
                  </div>
                  \${step.error ? '<div class="step-error">' + step.error + '</div>' : ''}
                </div>
              </div>
            \`;
          }).join('')}
        </div>\` : '';

      const errorHtml = result.error ?
        '<div class="error-details">' + result.error + '</div>' : '';

      const screenshotHtml = result.screenshot ?
        '<div class="screenshot-link"><a href="' + result.screenshot + '" target="_blank">📸 View Screenshot</a></div>' : '';

      return \`
        <div class="env-result \${statusClass}">
          <div class="result-header">
            <div class="status-badge \${statusClass}">
              <span class="status-icon \${statusClass}">\${statusIcon}</span>
              <span>\${result.passed ? 'Passed' : 'Failed'}</span>
            </div>
            <span class="duration">\${(result.duration / 1000).toFixed(2)}s</span>
          </div>
          \${stepsHtml}
          \${errorHtml}
          \${screenshotHtml}
        </div>
      \`;
    }

    renderResults();
  </script>
</body>
</html>
    `.trim();
  }

  private convertResultToJson(result: TestResult) {
    const screenshotRelativePath = path.relative(
      path.join(this.outputDir, 'playwright-report'),
      result.screenshot
    );

    return {
      passed: result.passed,
      duration: result.duration,
      error: result.error,
      screenshot: screenshotRelativePath,
      steps: result.detailedResults?.steps || [],
    };
  }
}

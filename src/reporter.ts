import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, TestResult, Report } from './types';
import { Differ } from './differ';

export class ReportGenerator {
  constructor(private config: Config) {}

  async generate(results: TestResult[]): Promise<string> {
    const startTime = Date.now();

    // Separate live and dev results
    const liveResults = results.filter((r) => r.environment === 'live');
    const devResults = results.filter((r) => r.environment === 'dev');

    // Generate comparisons
    const differ = new Differ(this.config.outputDir, this.config.diffThreshold);
    const comparisons = await differ.compareResults(liveResults, devResults);

    // Create report object
    const report: Report = {
      timestamp: new Date().toISOString(),
      liveUrl: this.config.liveUrl,
      devUrl: this.config.devUrl,
      totalTests: liveResults.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      comparisons,
      duration: Date.now() - startTime,
    };

    // Generate HTML report
    const htmlPath = await this.generateHtmlReport(report);

    // Generate markdown summary
    await this.generateMarkdownSummary(report);

    // Save raw data
    await this.saveRawData(report);

    return htmlPath;
  }

  private async generateHtmlReport(report: Report): Promise<string> {
    const html = this.buildHtmlReport(report);
    const htmlPath = path.join(this.config.outputDir, 'report.html');

    await fs.writeFile(htmlPath, html);

    return htmlPath;
  }

  private buildHtmlReport(report: Report): string {
    const comparisonRows = report.comparisons
      .map((comp) => {
        const statusClass = comp.hasDifferences ? 'diff' : 'match';
        const statusText = comp.hasDifferences
          ? `${comp.diffPercentage}% different`
          : 'No differences';

        return `
        <tr class="${statusClass}">
          <td>${comp.route}</td>
          <td class="status">${statusText}</td>
          <td class="screenshots">
            <div class="screenshot-container">
              <div class="screenshot-item">
                <h4>Live</h4>
                <img src="${path.relative(this.config.outputDir, comp.liveScreenshot)}" alt="Live" />
              </div>
              <div class="screenshot-item">
                <h4>Dev</h4>
                <img src="${path.relative(this.config.outputDir, comp.devScreenshot)}" alt="Dev" />
              </div>
              ${
                comp.diffScreenshot
                  ? `
              <div class="screenshot-item">
                <h4>Diff</h4>
                <img src="${path.relative(this.config.outputDir, comp.diffScreenshot)}" alt="Diff" />
              </div>
              `
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>lastest Report - ${new Date(report.timestamp).toLocaleString()}</title>
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
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
    }

    h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .meta {
      opacity: 0.9;
      font-size: 14px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px 40px;
      border-bottom: 1px solid #e0e0e0;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 36px;
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

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }

    tr.match {
      background: #f0fdf4;
    }

    tr.diff {
      background: #fef2f2;
    }

    .status {
      font-weight: 600;
    }

    .screenshot-container {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .screenshot-item {
      flex: 1;
      min-width: 200px;
    }

    .screenshot-item h4 {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .screenshot-item img {
      width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .screenshot-item img:hover {
      transform: scale(1.05);
    }

    .urls {
      padding: 20px 40px;
      background: #f9fafb;
      border-bottom: 1px solid #e0e0e0;
    }

    .urls h3 {
      margin-bottom: 10px;
      color: #374151;
    }

    .url-item {
      margin: 5px 0;
      font-family: monospace;
      font-size: 14px;
      color: #6b7280;
    }

    footer {
      padding: 20px 40px;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 lastest Report</h1>
      <div class="meta">
        Generated: ${new Date(report.timestamp).toLocaleString()} |
        Duration: ${(report.duration / 1000).toFixed(2)}s
      </div>
    </header>

    <div class="urls">
      <h3>Test URLs</h3>
      <div class="url-item"><strong>Live:</strong> ${report.liveUrl}</div>
      <div class="url-item"><strong>Dev:</strong> ${report.devUrl}</div>
    </div>

    <div class="summary">
      <div class="stat">
        <div class="stat-value">${report.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat passed">
        <div class="stat-value">${report.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat failed">
        <div class="stat-value">${report.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.comparisons.filter((c) => c.hasDifferences).length}</div>
        <div class="stat-label">Differences Found</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Route</th>
          <th>Status</th>
          <th>Screenshots</th>
        </tr>
      </thead>
      <tbody>
        ${comparisonRows}
      </tbody>
    </table>

    <footer>
      Generated by <strong>lastest</strong> - AI-powered visual testing
    </footer>
  </div>
</body>
</html>
    `.trim();
  }

  private async generateMarkdownSummary(report: Report): Promise<void> {
    const diffCount = report.comparisons.filter((c) => c.hasDifferences).length;
    const matchCount = report.comparisons.length - diffCount;

    const markdown = `# lastest Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Duration:** ${(report.duration / 1000).toFixed(2)}s

## URLs

- **Live:** ${report.liveUrl}
- **Dev:** ${report.devUrl}

## Summary

- **Total Tests:** ${report.totalTests}
- **Passed:** ${report.passed}
- **Failed:** ${report.failed}
- **Matches:** ${matchCount}
- **Differences Found:** ${diffCount}

## Comparisons

${report.comparisons
  .map((comp) => {
    const status = comp.hasDifferences
      ? `❌ **${comp.diffPercentage}% different**`
      : '✅ **No differences**';

    return `### ${comp.route}

${status}

- Live: \`${comp.liveScreenshot}\`
- Dev: \`${comp.devScreenshot}\`${comp.diffScreenshot ? `\n- Diff: \`${comp.diffScreenshot}\`` : ''}
`;
  })
  .join('\n')}

---

Generated by **lastest** - AI-powered visual testing
`;

    const summaryPath = path.join(this.config.outputDir, 'summary.md');
    await fs.writeFile(summaryPath, markdown);
  }

  private async saveRawData(report: Report): Promise<void> {
    const dataPath = path.join(this.config.outputDir, 'data.json');
    await fs.writeFile(dataPath, JSON.stringify(report, null, 2));
  }
}

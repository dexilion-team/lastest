import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, TestResult, Report } from './types';
import { Differ } from './differ';
import { PlaywrightReporter } from './playwright-reporter';

export class ReportGenerator {
  constructor(private config: Config) {}

  async generate(results: TestResult[]): Promise<{ reportPath: string; report: Report }> {
    const startTime = Date.now();

    // Separate live and dev results
    const liveResults = results.filter((r) => r.environment === 'live');
    const devResults = results.filter((r) => r.environment === 'dev');

    // Generate comparisons
    const differ = new Differ(this.config.outputDir, this.config.diffThreshold);
    const comparisons = await differ.compareResults(liveResults, devResults);

    // Calculate environment-specific stats
    const environmentStats = {
      live: {
        total: liveResults.length,
        passed: liveResults.filter(r => r.passed).length,
        failed: liveResults.filter(r => !r.passed).length,
      },
      dev: {
        total: devResults.length,
        passed: devResults.filter(r => r.passed).length,
        failed: devResults.filter(r => !r.passed).length,
      },
    };

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
      environmentStats,
      detailedResults: results,
    };

    // Generate Playwright report
    const playwrightReporter = new PlaywrightReporter(this.config.outputDir);
    await playwrightReporter.generateReport(results, this.config.liveUrl, this.config.devUrl);

    // Generate HTML report
    const htmlPath = await this.generateHtmlReport(report);

    // Generate markdown summary
    await this.generateMarkdownSummary(report);

    // Save raw data
    await this.saveRawData(report);

    return { reportPath: htmlPath, report };
  }

  private async generateHtmlReport(report: Report): Promise<string> {
    const html = this.buildHtmlReport(report);
    const htmlPath = path.join(this.config.outputDir, 'report.html');

    await fs.writeFile(htmlPath, html);

    return htmlPath;
  }

  private buildComparisonView(report: Report): string {
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
    `;
  }

  private buildTestResultsView(report: Report): string {
    if (!report.detailedResults) {
      return '<p>No detailed test results available.</p>';
    }

    // Group results by route
    const routeGroups = new Map<string, { live?: TestResult; dev?: TestResult }>();

    for (const result of report.detailedResults) {
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

    const rows = Array.from(routeGroups.entries()).map(([route, { live, dev }]) => {
      const liveStatus = live
        ? `<div class="env-result ${live.passed ? 'passed' : 'failed'}">
             <span class="status-icon">${live.passed ? '✓' : '✗'}</span>
             <span class="status-text">${live.passed ? 'Passed' : 'Failed'}</span>
             <span class="duration">${(live.duration / 1000).toFixed(2)}s</span>
           </div>
           ${live.error ? `<div class="error-msg">${live.error}</div>` : ''}`
        : '<div class="env-result missing">No data</div>';

      const devStatus = dev
        ? `<div class="env-result ${dev.passed ? 'passed' : 'failed'}">
             <span class="status-icon">${dev.passed ? '✓' : '✗'}</span>
             <span class="status-text">${dev.passed ? 'Passed' : 'Failed'}</span>
             <span class="duration">${(dev.duration / 1000).toFixed(2)}s</span>
           </div>
           ${dev.error ? `<div class="error-msg">${dev.error}</div>` : ''}`
        : '<div class="env-result missing">No data</div>';

      return `
        <tr>
          <td class="route-name">${route}</td>
          <td>${liveStatus}</td>
          <td>${devStatus}</td>
        </tr>
      `;
    }).join('');

    return `
    <table class="test-results-table">
      <thead>
        <tr>
          <th>Route</th>
          <th>Live Environment</th>
          <th>Dev Environment</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    `;
  }

  private buildViewportComparisonView(report: Report, viewport: { name: string; slug: string; width: number; height: number }): string {
    // Filter comparisons by viewport
    const viewportComparisons = report.comparisons.filter(
      c => c.viewport === viewport.slug
    );

    // Filter results by viewport
    const viewportResults = report.detailedResults?.filter(
      r => r.viewport === viewport.slug
    ) || [];

    const liveResults = viewportResults.filter(r => r.environment === 'live');
    const devResults = viewportResults.filter(r => r.environment === 'dev');

    const stats = {
      live: {
        total: liveResults.length,
        passed: liveResults.filter(r => r.passed).length,
        failed: liveResults.filter(r => !r.passed).length
      },
      dev: {
        total: devResults.length,
        passed: devResults.filter(r => r.passed).length,
        failed: devResults.filter(r => !r.passed).length
      }
    };

    const comparisonRows = viewportComparisons
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
    <div class="viewport-section">
      <h2>${viewport.name} (${viewport.width}x${viewport.height})</h2>

      <div class="env-stat-row">
        <div class="env-stat-item">
          <div class="env-stat-label">Live Environment</div>
          <div class="env-stat-value">
            ${stats.live.passed}/${stats.live.total} passed
          </div>
        </div>
        <div class="env-stat-item">
          <div class="env-stat-label">Dev Environment</div>
          <div class="env-stat-value">
            ${stats.dev.passed}/${stats.dev.total} passed
          </div>
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
    </div>
    `;
  }

  private buildHtmlReport(report: Report): string {
    const comparisonView = this.buildComparisonView(report);
    const testResultsView = this.buildTestResultsView(report);

    // Get viewports from config
    const viewports = this.config.viewports || [
      { name: 'Desktop', slug: 'desktop', width: 1920, height: 1080 }
    ];

    // Build viewport comparison views
    const viewportViews = viewports.map(vp => ({
      viewport: vp,
      content: this.buildViewportComparisonView(report, vp)
    }));

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

    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      overflow: auto;
    }

    .modal.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-content {
      position: relative;
      max-width: 95%;
      max-height: 95%;
      margin: auto;
    }

    .modal-image {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.3s;
      cursor: zoom-in;
    }

    .modal-image.zoomed {
      transform: scale(2);
      cursor: zoom-out;
    }

    .modal-close {
      position: absolute;
      top: 20px;
      right: 35px;
      color: #f1f1f1;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
      z-index: 1001;
    }

    .modal-close:hover,
    .modal-close:focus {
      color: #bbb;
    }

    .modal-caption {
      text-align: center;
      color: #ccc;
      padding: 10px 0;
      font-size: 16px;
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

    .tabs {
      display: flex;
      border-bottom: 2px solid #e0e0e0;
      background: #f9fafb;
      padding: 0 40px;
    }

    .tab {
      padding: 15px 25px;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      font-weight: 500;
      color: #6b7280;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #374151;
      background: #f3f4f6;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      background: white;
    }

    .tab-content {
      display: none;
      padding: 30px 40px;
    }

    .tab-content.active {
      display: block;
    }

    .env-stat-row {
      display: flex;
      gap: 20px;
      margin-top: 15px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 6px;
    }

    .env-stat-item {
      flex: 1;
    }

    .env-stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .env-stat-value {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
    }

    .test-results-table {
      width: 100%;
      border-collapse: collapse;
    }

    .test-results-table th,
    .test-results-table td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    .test-results-table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }

    .route-name {
      font-family: monospace;
      font-size: 14px;
      color: #374151;
      font-weight: 500;
    }

    .env-result {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
    }

    .env-result.passed {
      background: #f0fdf4;
      color: #166534;
    }

    .env-result.failed {
      background: #fef2f2;
      color: #991b1b;
    }

    .env-result.missing {
      background: #f3f4f6;
      color: #6b7280;
    }

    .env-result .status-icon {
      font-weight: bold;
      font-size: 16px;
    }

    .env-result .duration {
      margin-left: auto;
      font-size: 12px;
      opacity: 0.8;
    }

    .error-msg {
      margin-top: 8px;
      padding: 8px 12px;
      background: #fee;
      border-left: 3px solid #ef4444;
      font-size: 12px;
      font-family: monospace;
      color: #991b1b;
      border-radius: 4px;
    }

    .playwright-frame {
      width: 100%;
      height: 800px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }

    .viewport-section {
      margin-bottom: 30px;
    }

    .viewport-section h2 {
      font-size: 20px;
      color: #374151;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
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
        <div class="stat-label">Visual Differences</div>
      </div>
    </div>

    ${report.environmentStats ? `
    <div class="env-stat-row">
      <div class="env-stat-item">
        <div class="env-stat-label">Live Environment</div>
        <div class="env-stat-value">
          ${report.environmentStats.live.passed}/${report.environmentStats.live.total} passed
        </div>
      </div>
      <div class="env-stat-item">
        <div class="env-stat-label">Dev Environment</div>
        <div class="env-stat-value">
          ${report.environmentStats.dev.passed}/${report.environmentStats.dev.total} passed
        </div>
      </div>
    </div>
    ` : ''}

    <div class="tabs">
      <div class="tab active" data-tab="comparison">Visual Comparison</div>
      <div class="tab" data-tab="test-results">Test Results</div>
      <div class="tab" data-tab="playwright">Step-by-Step Comparison</div>
      ${viewportViews.map(vv => `
      <div class="tab" data-tab="viewport-${vv.viewport.slug}">${vv.viewport.name}</div>
      `).join('')}
    </div>

    <div class="tab-content active" id="comparison">
      ${comparisonView}
    </div>

    <div class="tab-content" id="test-results">
      ${testResultsView}
    </div>

    <div class="tab-content" id="playwright">
      <iframe src="playwright-report/index.html" class="playwright-frame"></iframe>
    </div>

    ${viewportViews.map(vv => `
    <div class="tab-content" id="viewport-${vv.viewport.slug}">
      ${vv.content}
    </div>
    `).join('')}

    <footer>
      Generated by <strong>lastest</strong> - AI-powered visual testing
    </footer>
  </div>

  <!-- Fullscreen Modal -->
  <div id="imageModal" class="modal">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <div class="modal-content">
      <img id="modalImage" class="modal-image" onclick="toggleZoom()" alt="Fullscreen view">
      <div class="modal-caption" id="modalCaption"></div>
    </div>
  </div>

  <script>
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', function() {
        const targetTab = this.dataset.tab;

        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        this.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        // Update URL hash
        window.location.hash = targetTab;
      });
    });

    // Handle initial hash navigation
    window.addEventListener('load', function() {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const tab = document.querySelector(\`[data-tab="\${hash}"]\`);
        if (tab) {
          tab.click();
        }
      }
    });

    // Get modal elements
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');

    // Add click handlers to all screenshot images
    document.querySelectorAll('.screenshot-item img').forEach(img => {
      img.addEventListener('click', function() {
        modal.classList.add('active');
        modalImg.src = this.src;
        modalImg.alt = this.alt;
        modalCaption.textContent = this.alt + ' - Click to zoom, ESC to close';
        modalImg.classList.remove('zoomed');
      });
    });

    // Close modal function
    function closeModal() {
      modal.classList.remove('active');
      modalImg.classList.remove('zoomed');
    }

    // Toggle zoom function
    function toggleZoom() {
      modalImg.classList.toggle('zoomed');
    }

    // Close on ESC key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    });

    // Close when clicking outside the image
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeModal();
      }
    });
  </script>
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

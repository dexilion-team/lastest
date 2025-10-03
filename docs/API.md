# API Documentation

Programmatic API for using **lastest** in your Node.js applications.

## Installation

```bash
npm install lastest
```

## Basic Usage

```typescript
import { Scanner, TestGenerator, TestRunner, ReportGenerator } from 'lastest';
import { Config } from 'lastest/types';

const config: Config = {
  aiProvider: 'claude',
  claudeApiKey: process.env.ANTHROPIC_API_KEY!,
  liveUrl: 'https://example.com',
  devUrl: 'http://localhost:3000',
  scanPath: '.',
  outputDir: 'results',
  viewport: { width: 1920, height: 1080 },
  diffThreshold: 0.1,
  parallel: true,
  maxConcurrency: 5,
};

// Scan for routes
const scanner = new Scanner(config.scanPath);
const routes = await scanner.scan();

// Generate tests
const generator = new TestGenerator(config);
const tests = await generator.generateTests(routes);

// Run tests
const runner = new TestRunner(config);
const results = await runner.runTests(tests);

// Generate report
const reporter = new ReportGenerator(config);
const reportPath = await reporter.generate(results);

console.log(`Report: ${reportPath}`);
```

## API Reference

### Scanner

Scans codebase for routes.

#### Constructor

```typescript
new Scanner(scanPath: string)
```

**Parameters:**
- `scanPath` - Directory to scan

#### Methods

##### `scan()`

Scans for routes and returns route information.

```typescript
async scan(): Promise<RouteInfo[]>
```

**Returns:** Array of `RouteInfo` objects

**Example:**
```typescript
const scanner = new Scanner('./src');
const routes = await scanner.scan();

console.log(routes);
// [
//   { path: '/', type: 'static', filePath: '/app/page.tsx' },
//   { path: '/about', type: 'static', filePath: '/app/about/page.tsx' }
// ]
```

---

### TestGenerator

Generates Playwright tests using AI.

#### Constructor

```typescript
new TestGenerator(config: Config)
```

**Parameters:**
- `config` - Configuration object

**Throws:** Error if Claude API key is missing

#### Methods

##### `generateTests()`

Generates tests for given routes.

```typescript
async generateTests(routes: RouteInfo[]): Promise<TestCase[]>
```

**Parameters:**
- `routes` - Array of routes to generate tests for

**Returns:** Array of `TestCase` objects

**Example:**
```typescript
const generator = new TestGenerator({
  aiProvider: 'claude',
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  // ... other config
});

const tests = await generator.generateTests(routes);

console.log(tests);
// [
//   {
//     name: 'home',
//     route: '/',
//     code: '...',
//     filePath: '/results/tests/home.ts'
//   }
// ]
```

---

### TestRunner

Executes Playwright tests.

#### Constructor

```typescript
new TestRunner(config: Config)
```

**Parameters:**
- `config` - Configuration object

#### Methods

##### `runTests()`

Runs tests against both environments.

```typescript
async runTests(tests: TestCase[]): Promise<TestResult[]>
```

**Parameters:**
- `tests` - Array of test cases to run

**Returns:** Array of `TestResult` objects (both live and dev)

**Example:**
```typescript
const runner = new TestRunner(config);
const results = await runner.runTests(tests);

console.log(results);
// [
//   {
//     route: '/',
//     url: 'https://example.com/',
//     environment: 'live',
//     passed: true,
//     screenshot: '/results/screenshots/live/home.png',
//     duration: 1234
//   },
//   {
//     route: '/',
//     url: 'http://localhost:3000/',
//     environment: 'dev',
//     passed: true,
//     screenshot: '/results/screenshots/dev/home.png',
//     duration: 987
//   }
// ]
```

---

### Differ

Compares screenshots.

#### Constructor

```typescript
new Differ(outputDir: string, threshold?: number)
```

**Parameters:**
- `outputDir` - Directory for diff images
- `threshold` - Difference threshold (0-1), default: 0.1

#### Methods

##### `compareResults()`

Compares live and dev screenshots.

```typescript
async compareResults(
  liveResults: TestResult[],
  devResults: TestResult[]
): Promise<ComparisonResult[]>
```

**Parameters:**
- `liveResults` - Test results from live environment
- `devResults` - Test results from dev environment

**Returns:** Array of `ComparisonResult` objects

**Example:**
```typescript
const differ = new Differ('results', 0.1);

const liveResults = results.filter(r => r.environment === 'live');
const devResults = results.filter(r => r.environment === 'dev');

const comparisons = await differ.compareResults(liveResults, devResults);

console.log(comparisons);
// [
//   {
//     route: '/',
//     liveScreenshot: '/results/screenshots/live/home.png',
//     devScreenshot: '/results/screenshots/dev/home.png',
//     diffScreenshot: '/results/diffs/home-diff.png',
//     diffPercentage: 2.5,
//     hasDifferences: true
//   }
// ]
```

---

### ReportGenerator

Generates test reports.

#### Constructor

```typescript
new ReportGenerator(config: Config)
```

**Parameters:**
- `config` - Configuration object

#### Methods

##### `generate()`

Generates HTML, Markdown, and JSON reports.

```typescript
async generate(results: TestResult[]): Promise<string>
```

**Parameters:**
- `results` - Array of all test results

**Returns:** Path to HTML report

**Generates:**
- `{outputDir}/report.html` - Interactive HTML report
- `{outputDir}/summary.md` - Markdown summary
- `{outputDir}/data.json` - Raw JSON data

**Example:**
```typescript
const reporter = new ReportGenerator(config);
const reportPath = await reporter.generate(results);

console.log(`Report generated: ${reportPath}`);
// Report generated: /results/report.html
```

---

### ConfigManager

Manages configuration files.

#### Static Methods

##### `load()`

Loads configuration from `.lastestrc.json`.

```typescript
static async load(cwd?: string): Promise<Config | null>
```

**Parameters:**
- `cwd` - Working directory, default: `process.cwd()`

**Returns:** Config object or null if not found

**Example:**
```typescript
import { ConfigManager } from 'lastest';

const config = await ConfigManager.load();

if (config) {
  console.log('Loaded config:', config);
} else {
  console.log('No config file found');
}
```

##### `save()`

Saves configuration to `.lastestrc.json`.

```typescript
static async save(config: Config, cwd?: string): Promise<void>
```

**Parameters:**
- `config` - Configuration to save
- `cwd` - Working directory, default: `process.cwd()`

**Example:**
```typescript
import { ConfigManager } from 'lastest';

await ConfigManager.save({
  aiProvider: 'claude',
  liveUrl: 'https://example.com',
  devUrl: 'http://localhost:3000',
  scanPath: '.',
  outputDir: 'results',
});

console.log('Config saved to .lastestrc.json');
```

##### `getDefaultConfig()`

Returns default configuration values.

```typescript
static getDefaultConfig(): Partial<Config>
```

**Returns:** Partial config with defaults

**Example:**
```typescript
import { ConfigManager } from 'lastest';

const defaults = ConfigManager.getDefaultConfig();

console.log(defaults);
// {
//   scanPath: '.',
//   outputDir: 'lastest-results',
//   viewport: { width: 1920, height: 1080 },
//   diffThreshold: 0.1,
//   parallel: true,
//   maxConcurrency: 5
// }
```

---

## Type Definitions

### Config

```typescript
interface Config {
  aiProvider: 'claude' | 'copilot';
  claudeApiKey?: string;
  liveUrl: string;
  devUrl: string;
  scanPath: string;
  outputDir: string;
  viewport?: {
    width: number;
    height: number;
  };
  diffThreshold?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}
```

### RouteInfo

```typescript
interface RouteInfo {
  path: string;                // Route path (e.g., '/about')
  type: 'static' | 'dynamic';  // Route type
  filePath?: string;           // Source file path
  component?: string;          // Component name
}
```

### TestCase

```typescript
interface TestCase {
  name: string;      // Test name (e.g., 'home')
  route: string;     // Route path (e.g., '/')
  code: string;      // Generated test code
  filePath: string;  // Test file path
}
```

### TestResult

```typescript
interface TestResult {
  route: string;              // Route path
  url: string;                // Full URL tested
  environment: 'live' | 'dev'; // Environment
  passed: boolean;            // Test passed/failed
  screenshot: string;         // Screenshot path
  duration: number;           // Duration in ms
  error?: string;             // Error message (if failed)
}
```

### ComparisonResult

```typescript
interface ComparisonResult {
  route: string;           // Route path
  liveScreenshot: string;  // Live screenshot path
  devScreenshot: string;   // Dev screenshot path
  diffScreenshot?: string; // Diff image path (if differences)
  diffPercentage: number;  // Difference percentage (0-100)
  hasDifferences: boolean; // Has visual differences
}
```

### Report

```typescript
interface Report {
  timestamp: string;               // ISO timestamp
  liveUrl: string;                 // Live URL
  devUrl: string;                  // Dev URL
  totalTests: number;              // Total test count
  passed: number;                  // Passed test count
  failed: number;                  // Failed test count
  comparisons: ComparisonResult[]; // Comparison results
  duration: number;                // Total duration in ms
}
```

## Advanced Examples

### Custom Workflow

```typescript
import { Scanner, TestGenerator, TestRunner, Differ, ReportGenerator } from 'lastest';

async function customWorkflow() {
  // 1. Scan specific directories
  const scanner = new Scanner('./src/app');
  const routes = await scanner.scan();

  // 2. Filter routes
  const staticRoutes = routes.filter(r => r.type === 'static');

  // 3. Generate tests
  const generator = new TestGenerator(config);
  const tests = await generator.generateTests(staticRoutes);

  // 4. Run only on dev (for testing)
  const runner = new TestRunner({
    ...config,
    devUrl: 'http://localhost:3000',
    liveUrl: 'http://localhost:3000', // Same URL
  });

  const results = await runner.runTests(tests);

  // 5. Custom comparison
  const differ = new Differ('results', 0.2);
  const liveResults = results.filter(r => r.environment === 'live');
  const devResults = results.filter(r => r.environment === 'dev');
  const comparisons = await differ.compareResults(liveResults, devResults);

  // 6. Generate report
  const reporter = new ReportGenerator(config);
  await reporter.generate(results);

  // 7. Custom processing
  const failures = comparisons.filter(c => c.hasDifferences);
  if (failures.length > 0) {
    console.error(`${failures.length} visual differences found!`);
    process.exit(1);
  }
}
```

### Integration with Testing Framework

```typescript
import { describe, it, expect } from 'vitest';
import { Scanner, TestGenerator, TestRunner } from 'lastest';

describe('Visual regression tests', () => {
  it('should have no visual differences', async () => {
    const scanner = new Scanner('.');
    const routes = await scanner.scan();

    const generator = new TestGenerator(config);
    const tests = await generator.generateTests(routes);

    const runner = new TestRunner(config);
    const results = await runner.runTests(tests);

    const failures = results.filter(r => !r.passed);
    expect(failures).toHaveLength(0);
  });
});
```

### Custom Reporter

```typescript
import { TestResult, ComparisonResult } from 'lastest/types';
import { Differ } from 'lastest';

async function customReport(results: TestResult[]) {
  const differ = new Differ('results', 0.1);

  const liveResults = results.filter(r => r.environment === 'live');
  const devResults = results.filter(r => r.environment === 'dev');

  const comparisons = await differ.compareResults(liveResults, devResults);

  // Send to Slack
  await sendToSlack({
    text: `Visual tests complete: ${comparisons.length} routes tested`,
    attachments: comparisons.map(c => ({
      color: c.hasDifferences ? 'danger' : 'good',
      text: `${c.route}: ${c.diffPercentage}% difference`,
    })),
  });
}
```

## Error Handling

All async methods may throw errors. Always wrap in try-catch:

```typescript
try {
  const scanner = new Scanner('./invalid-path');
  const routes = await scanner.scan();
} catch (error) {
  console.error('Scan failed:', error.message);
}
```

Common error types:
- `ConfigError` - Invalid configuration
- `ScanError` - Scan failures
- `GenerationError` - AI generation failures
- `TestError` - Test execution failures
- `ComparisonError` - Screenshot comparison failures

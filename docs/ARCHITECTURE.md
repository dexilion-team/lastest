# Architecture

Technical architecture and design decisions for **lastest**.

## Overview

lastest is built as a modular Node.js CLI tool with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│                   CLI Layer                     │
│           (Commander.js interface)              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Command Handler                     │
│          (src/commands/init.ts)                 │
└──┬────┬────┬────┬────┬────┬───────────────────┘
   │    │    │    │    │    │
   │    │    │    │    │    │
   ▼    ▼    ▼    ▼    ▼    ▼
┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐
│Scan││Gen ││Run ││Diff││Rpt ││Cfg │
│ner ││erator Run││fer ││orter Con││
└────┘└────┘└────┘└────┘└────┘└────┘
```

## Core Components

### 1. CLI Layer (`src/cli.ts`)

**Responsibilities:**
- Parse command-line arguments
- Validate options
- Route to appropriate command handlers
- Handle errors and exit codes

**Dependencies:**
- `commander` - CLI framework

**Key functions:**
```typescript
program
  .command('init')
  .description('Initialize and run tests')
  .option('--live <url>', 'Live URL')
  .option('--dev <url>', 'Dev URL')
  .action(initCommand);
```

### 2. Configuration Manager (`src/config.ts`)

**Responsibilities:**
- Load configuration from multiple sources
- Merge config with defaults
- Validate configuration
- Save configuration

**Priority order:**
1. CLI options
2. Config file (`.lastestrc.json`)
3. Environment variables
4. Defaults

**Key functions:**
```typescript
class ConfigManager {
  static async load(cwd: string): Promise<Config | null>
  static async save(config: Config, cwd: string): Promise<void>
  static getDefaultConfig(): Partial<Config>
}
```

### 3. Scanner (`src/scanner.ts`)

**Responsibilities:**
- Detect project type (Next.js, React, Vue)
- Scan codebase for routes
- Parse route definitions
- Categorize routes (static/dynamic)

**Supported frameworks:**
- Next.js App Router
- Next.js Pages Router
- React Router v6
- Vue Router v4

**Algorithm:**
```
1. Read package.json
2. Identify framework from dependencies
3. Scan appropriate directories:
   - Next.js: app/ or pages/
   - React: src/routes/, src/pages/
   - Vue: src/router/
4. Parse route definitions
5. Return RouteInfo[]
```

**Key functions:**
```typescript
class Scanner {
  async scan(): Promise<RouteInfo[]>
  private async detectProjectType(): Promise<string>
  private async scanNextJsApp(): Promise<RouteInfo[]>
  private async scanReactRouter(): Promise<RouteInfo[]>
}
```

### 4. AI Clients (`src/ai/`)

#### Claude Client (`src/ai/claude.ts`)

**Responsibilities:**
- Communicate with Claude API
- Generate test code from route info
- Parse and extract code from responses

**Key functions:**
```typescript
class ClaudeClient {
  async generateTest(route: RouteInfo): Promise<string>
  private buildPrompt(route: RouteInfo): string
  private extractCode(text: string): string
}
```

**Prompt engineering:**
- Provides route context
- Specifies Playwright requirements
- Requests TypeScript format
- Defines function signature

#### Copilot Client (`src/ai/copilot.ts`)

**Status:** Placeholder (GitHub Copilot SDK not publicly available)

**Future implementation:**
- Similar interface to ClaudeClient
- Use official SDK when available

### 5. Test Generator (`src/generator.ts`)

**Responsibilities:**
- Orchestrate AI test generation
- Write test files to disk
- Handle generation errors
- Skip dynamic routes

**Key functions:**
```typescript
class TestGenerator {
  async generateTests(routes: RouteInfo[]): Promise<TestCase[]>
  private getTestName(routePath: string): string
}
```

**Workflow:**
```
For each route:
  1. Skip if dynamic
  2. Call AI client
  3. Write test to file
  4. Add to TestCase[]
```

### 6. Test Runner (`src/runner.ts`)

**Responsibilities:**
- Launch Playwright browser
- Execute tests for both environments
- Capture screenshots
- Handle test failures
- Manage parallelization

**Key functions:**
```typescript
class TestRunner {
  async runTests(tests: TestCase[]): Promise<TestResult[]>
  private async runTestsForEnvironment(
    tests: TestCase[],
    environment: 'live' | 'dev',
    baseUrl: string
  ): Promise<TestResult[]>
  private async runSingleTest(...): Promise<TestResult>
}
```

**Execution strategy:**
- Parallel execution with concurrency limit
- Separate contexts for isolation
- Full-page screenshots
- Error handling and retry logic

### 7. Differ (`src/differ.ts`)

**Responsibilities:**
- Compare live vs dev screenshots
- Calculate difference percentage
- Generate diff images
- Handle dimension mismatches

**Algorithm:**
```
1. Load both screenshots
2. Normalize dimensions
3. Run pixelmatch:
   - Compare pixel by pixel
   - Apply threshold
   - Generate diff image
4. Calculate percentage
5. Save diff if differences found
```

**Key functions:**
```typescript
class Differ {
  async compareResults(
    liveResults: TestResult[],
    devResults: TestResult[]
  ): Promise<ComparisonResult[]>
  private async compareScreenshots(...): Promise<ComparisonResult>
}
```

### 8. Reporter (`src/reporter.ts`)

**Responsibilities:**
- Generate HTML report
- Generate Markdown summary
- Save raw JSON data
- Create file structure

**Output formats:**

**HTML Report:**
- Interactive web page
- Side-by-side screenshots
- Visual diff display
- Statistics dashboard

**Markdown Summary:**
- Text-based summary
- CI/CD friendly
- Git-friendly format

**JSON Data:**
- Raw test results
- Programmatic access
- Machine-readable

**Key functions:**
```typescript
class ReportGenerator {
  async generate(results: TestResult[]): Promise<string>
  private async generateHtmlReport(report: Report): Promise<string>
  private async generateMarkdownSummary(report: Report): Promise<void>
}
```

## Data Flow

### Complete workflow:

```
1. User runs: npx lastest init
                 │
                 ▼
2. CLI parses args and loads config
                 │
                 ▼
3. Scanner detects routes
   Input: scanPath
   Output: RouteInfo[]
                 │
                 ▼
4. Generator creates tests
   Input: RouteInfo[]
   Process: AI API calls
   Output: TestCase[]
                 │
                 ▼
5. Runner executes tests
   Input: TestCase[]
   Process: Playwright automation
   Output: TestResult[] (live + dev)
                 │
                 ▼
6. Differ compares screenshots
   Input: TestResult[] (live + dev)
   Process: Pixelmatch comparison
   Output: ComparisonResult[]
                 │
                 ▼
7. Reporter generates output
   Input: ComparisonResult[]
   Output: HTML + MD + JSON
                 │
                 ▼
8. User views report.html
```

## Type System

### Core Types (`src/types.ts`)

```typescript
// Configuration
interface Config {
  aiProvider: 'claude' | 'copilot';
  claudeApiKey?: string;
  liveUrl: string;
  devUrl: string;
  scanPath: string;
  outputDir: string;
  viewport?: { width: number; height: number };
  diffThreshold?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}

// Route discovery
interface RouteInfo {
  path: string;
  type: 'static' | 'dynamic';
  filePath?: string;
  component?: string;
}

// Generated test
interface TestCase {
  name: string;
  route: string;
  code: string;
  filePath: string;
}

// Test execution
interface TestResult {
  route: string;
  url: string;
  environment: 'live' | 'dev';
  passed: boolean;
  screenshot: string;
  duration: number;
  error?: string;
}

// Screenshot comparison
interface ComparisonResult {
  route: string;
  liveScreenshot: string;
  devScreenshot: string;
  diffScreenshot?: string;
  diffPercentage: number;
  hasDifferences: boolean;
}

// Final report
interface Report {
  timestamp: string;
  liveUrl: string;
  devUrl: string;
  totalTests: number;
  passed: number;
  failed: number;
  comparisons: ComparisonResult[];
  duration: number;
}
```

## Design Decisions

### 1. Why TypeScript?

- Type safety reduces bugs
- Better IDE support
- Self-documenting code
- Easier refactoring

### 2. Why Playwright?

- Modern API
- Cross-browser support
- Built-in screenshot capabilities
- Active development
- Better performance than Puppeteer

### 3. Why Commander.js?

- Industry standard
- Rich feature set
- Easy to use
- Well documented

### 4. Why Pixelmatch?

- Fast and accurate
- Configurable threshold
- Generates diff images
- No dependencies

### 5. Why Modular Architecture?

- Easier to test
- Easier to extend
- Clear responsibilities
- Maintainable code

### 6. Why Parallel Execution?

- Faster test runs
- Better resource utilization
- Configurable concurrency
- Optional (can disable)

## Performance Considerations

### Bottlenecks:

1. **AI API calls** - Slowest part
   - Solution: Cache generated tests
   - Future: Local AI models

2. **Screenshot capture** - I/O intensive
   - Solution: Parallel execution
   - Solution: Optimize image format

3. **Screenshot comparison** - CPU intensive
   - Solution: Worker threads (future)
   - Solution: Configurable threshold

### Optimizations:

- Reuse browser instances
- Parallel test execution
- Efficient file I/O
- Minimal dependencies

## Error Handling

### Strategy:

1. **Validate early** - Check config before execution
2. **Fail gracefully** - Continue on single test failures
3. **Provide context** - Clear error messages
4. **Log verbosely** - Debug-friendly output

### Error types:

- **Configuration errors** - Missing/invalid config
- **Network errors** - URL unreachable
- **AI errors** - API failures
- **Test errors** - Page load failures
- **File errors** - Permission/disk issues

## Testing Strategy

### Unit tests:

- Scanner route detection
- Config validation
- Differ algorithm
- Reporter output

### Integration tests:

- Full CLI workflow
- AI client mocking
- File system operations

### E2E tests:

- Real browser automation
- Actual AI API calls
- Complete workflow

## Future Improvements

1. **Local AI models** - Reduce API costs
2. **Test caching** - Reuse generated tests
3. **Incremental testing** - Test only changed pages
4. **Visual baselines** - Track changes over time
5. **Custom assertions** - User-defined checks
6. **Plugin system** - Extensibility
7. **Web UI** - Interactive report viewer
8. **Webhook integration** - Slack/Discord notifications

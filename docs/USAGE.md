# Usage Guide

Complete guide for using **lastest** in your projects.

## Table of Contents

- [Getting Started](#getting-started)
- [CLI Commands](#cli-commands)
- [Configuration](#configuration)
- [Workflow](#workflow)
- [Best Practices](#best-practices)

## Getting Started

### First Time Setup

1. **Install lastest**

```bash
npm install -g lastest
# or use npx
npx lastest init
```

2. **Get API Key**

For Claude (recommended):
- Visit https://console.anthropic.com/
- Create an API key
- Set environment variable: `export ANTHROPIC_API_KEY=your-key`

3. **Run Initial Scan**

```bash
cd your-project
lastest init
```

The interactive prompt will guide you through:
- AI provider selection
- API key setup (if needed)
- Codebase scan path
- Live URL
- Development URL

## CLI Commands

### `lastest init`

Initializes and runs the complete testing workflow.

**Options:**

- `--config <path>` - Path to config file
- `--live <url>` - Live environment URL
- `--dev <url>` - Development environment URL
- `--scan <path>` - Path to scan for routes
- `--ai <provider>` - AI provider ('claude' or 'copilot')

**Examples:**

```bash
# Interactive mode
lastest init

# With all options
lastest init \
  --live https://example.com \
  --dev http://localhost:3000 \
  --ai claude \
  --scan ./src

# With config file
lastest init --config custom-config.json
```

## Configuration

### Config File: `.lastestrc.json`

Create this file in your project root:

```json
{
  "aiProvider": "claude",
  "claudeApiKey": "sk-ant-...",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src",
  "outputDir": "lastest-results",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "diffThreshold": 1,
  "parallel": true,
  "maxConcurrency": 5
}
```

### Configuration Options

#### Required Settings

- **`aiProvider`** (`'claude' | 'copilot'`)
  - AI provider for test generation
  - Default: `'claude'`

- **`liveUrl`** (`string`)
  - Production/live environment URL
  - Example: `'https://example.com'`

- **`devUrl`** (`string`)
  - Development environment URL
  - Example: `'http://localhost:3000'`

#### Optional Settings

- **`claudeApiKey`** (`string`)
  - Claude API key (required if using Claude)
  - Can also be set via `ANTHROPIC_API_KEY` env var

- **`scanPath`** (`string`)
  - Path to scan for routes
  - Default: `'.'`

- **`outputDir`** (`string`)
  - Output directory for results
  - Default: `'lastest-results'`

- **`viewport`** (`object`)
  - Browser viewport dimensions
  - Default: `{ width: 1920, height: 1080 }`

- **`diffThreshold`** (`number`)
  - Pixel difference threshold (0-1)
  - Lower = more sensitive
  - Default: `0.1`

- **`parallel`** (`boolean`)
  - Enable parallel test execution
  - Default: `true`

- **`maxConcurrency`** (`number`)
  - Maximum parallel tests
  - Default: `5`

### Environment Variables

```bash
# Claude API key
export ANTHROPIC_API_KEY=your-key

# Override config
export LASTEST_LIVE_URL=https://example.com
export LASTEST_DEV_URL=http://localhost:3000
```

## Workflow

### 1. Scan Phase

lastest analyzes your codebase to discover routes:

**Supported Frameworks:**
- Next.js (App Router & Pages Router)
- React Router
- Vue Router
- Generic static sites

**Detection Logic:**
- Scans for route files and configurations
- Identifies page components
- Extracts route paths
- Categorizes static vs dynamic routes

### 2. Generate Phase

AI generates Playwright tests for each route:

**Test Generation:**
- Creates navigation logic
- Adds page load validation
- Includes screenshot capture
- Handles common edge cases

**Claude Prompt:**
- Analyzes route context
- Considers component structure
- Generates idiomatic test code

### 3. Execute Phase

Runs tests against both environments:

**Execution Order:**
1. Live environment tests
2. Dev environment tests
3. Parallel execution (if enabled)

**Per-Test Actions:**
- Navigate to page
- Wait for page load
- Capture full-page screenshot
- Record timing metrics

### 4. Compare Phase

Compares screenshots pixel-by-pixel:

**Comparison Process:**
- Load both screenshots
- Normalize dimensions
- Run pixelmatch algorithm
- Calculate difference percentage
- Generate diff image (if differences found)

### 5. Report Phase

Generates comprehensive reports:

**Outputs:**
- `report.html` - Interactive web report
- `summary.md` - Text summary
- `data.json` - Raw data
- Screenshots in organized folders
- Diff images for visual changes

## Best Practices

### 1. Pre-Test Checklist

- ✅ Both environments are running
- ✅ URLs are accessible
- ✅ No auth walls (or configure auth)
- ✅ Database is seeded consistently
- ✅ Dynamic content is stable

### 2. Configuration Tips

**Viewport Size:**
```json
{
  "viewport": {
    "width": 1920,   // Desktop
    "height": 1080
  }
}
```

For mobile testing, run separate configs:
```json
{
  "viewport": {
    "width": 375,    // iPhone
    "height": 812
  }
}
```

**Diff Threshold:**
- `0.0` - Exact pixel match (very strict)
- `0.1` - Small differences allowed (default)
- `0.3` - Moderate tolerance
- `0.5` - High tolerance

### 3. Dynamic Content

For pages with timestamps, random data, or ads:

1. Use consistent test data
2. Mock external APIs
3. Freeze time in tests
4. Increase diff threshold
5. Exclude specific elements

### 4. Authentication

For protected pages:

```typescript
// In generated test (modify after generation)
await page.context().addCookies([
  {
    name: 'auth_token',
    value: 'test-token',
    domain: 'example.com',
    path: '/'
  }
]);
```

### 5. CI/CD Integration

**GitHub Actions Example:**

```yaml
- name: Start dev server
  run: npm run dev &

- name: Wait for server
  run: npx wait-on http://localhost:3000

- name: Run visual tests
  run: npx lastest init --config .lastestrc.ci.json

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: visual-tests
    path: lastest-results/
```

### 6. Ignoring Routes

Currently, you can skip dynamic routes by not providing test data. Future versions will support explicit ignore patterns.

### 7. Performance Optimization

**Parallel Execution:**
```json
{
  "parallel": true,
  "maxConcurrency": 10  // Increase for faster execution
}
```

**Selective Scanning:**
```json
{
  "scanPath": "./src/pages"  // Narrow scope
}
```

## Troubleshooting

### Tests Taking Too Long

- Increase `maxConcurrency`
- Reduce `scanPath` scope
- Use faster hardware
- Check network latency

### High False Positive Rate

- Increase `diffThreshold`
- Stabilize dynamic content
- Use consistent viewport
- Check for animations

### API Rate Limits

- Reduce concurrent AI requests
- Use local caching
- Implement retry logic
- Switch to Copilot

### Memory Issues

- Reduce `maxConcurrency`
- Process routes in batches
- Close browser contexts properly
- Increase system memory

## Next Steps

- [Configuration Reference](CONFIGURATION.md)
- [Examples](EXAMPLES.md)
- [Architecture](ARCHITECTURE.md)
- [API Documentation](API.md)

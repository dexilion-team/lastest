# Configuration Reference

Complete reference for **lastest** configuration options.

## Configuration Methods

### 1. Config File (Recommended)

Create `.lastestrc.json` in your project root:

```json
{
  "aiProvider": "claude",
  "claudeApiKey": "sk-ant-...",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000"
}
```

### 2. CLI Options

```bash
lastest init --live https://example.com --dev http://localhost:3000
```

### 3. Environment Variables

```bash
export ANTHROPIC_API_KEY=your-key
export LASTEST_LIVE_URL=https://example.com
```

### 4. Interactive Prompts

```bash
lastest init
# Follow the prompts
```

## Full Configuration Schema

```typescript
interface Config {
  // Required
  aiProvider: 'claude' | 'copilot';
  liveUrl: string;
  devUrl: string;

  // Optional
  claudeApiKey?: string;
  scanPath?: string;
  outputDir?: string;
  viewport?: {
    width: number;
    height: number;
  };
  diffThreshold?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}
```

## Configuration Options

### `aiProvider`

**Type:** `'claude-api' | 'claude-subscription' | 'copilot-subscription'`
**Required:** Yes
**Default:** `'claude-api'`

AI provider for test generation.

**Options:**
- `'claude-api'` - Anthropic Claude API (pay-per-use, requires API key)
- `'claude-subscription'` - Use existing Claude Pro/Max subscription
- `'copilot-subscription'` - Use existing GitHub Copilot subscription

**Example:**
```json
{
  "aiProvider": "claude-subscription"
}
```

### `claudeApiKey`

**Type:** `string`
**Required:** Only for `'claude-api'` provider
**Default:** `process.env.ANTHROPIC_API_KEY`

Claude API key for authentication (not needed for subscription-based providers).

**Get your key:** https://console.anthropic.com/

**Example:**
```json
{
  "aiProvider": "claude-api",
  "claudeApiKey": "sk-ant-api03-..."
}
```

**Alternative:**
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Note:** Not required for `claude-subscription` or `copilot-subscription` providers.

### `liveUrl`

**Type:** `string`
**Required:** Yes
**Default:** None

Production/live environment URL.

**Requirements:**
- Must be a valid URL
- Must be publicly accessible
- Should not require authentication (or configure auth)

**Example:**
```json
{
  "liveUrl": "https://example.com"
}
```

### `devUrl`

**Type:** `string`
**Required:** Yes
**Default:** None

Development environment URL.

**Common values:**
- `http://localhost:3000` (Next.js, React)
- `http://localhost:8080` (Vue)
- `http://localhost:5173` (Vite)

**Example:**
```json
{
  "devUrl": "http://localhost:3000"
}
```

### `scanPath`

**Type:** `string`
**Required:** No
**Default:** `'.'`

Path to scan for routes relative to config file.

**Examples:**
```json
{
  "scanPath": "./src"
}

// Next.js
{
  "scanPath": "./app"
}

// React Router
{
  "scanPath": "./src/pages"
}
```

### `outputDir`

**Type:** `string`
**Required:** No
**Default:** `'lastest-results'`

Output directory for test results.

**Structure:**
```
outputDir/
├── report.html
├── summary.md
├── screenshots/
├── diffs/
├── tests/
└── data.json
```

**Example:**
```json
{
  "outputDir": "test-results"
}
```

### `viewport`

**Type:** `{ width: number, height: number }`
**Required:** No
**Default:** `{ width: 1920, height: 1080 }`

Browser viewport dimensions in pixels.

**Common viewports:**

```json
// Desktop
{
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}

// Laptop
{
  "viewport": {
    "width": 1366,
    "height": 768
  }
}

// Tablet
{
  "viewport": {
    "width": 768,
    "height": 1024
  }
}

// Mobile
{
  "viewport": {
    "width": 375,
    "height": 812
  }
}
```

### `diffThreshold`

**Type:** `number`
**Required:** No
**Default:** `0.1`
**Range:** `0.0` - `1.0`

Pixel difference threshold for visual comparison.

**Guidelines:**
- `0.0` - Exact match (very strict, may have false positives)
- `0.1` - Small differences (recommended default)
- `0.2` - Moderate tolerance
- `0.3` - High tolerance (for dynamic content)
- `0.5` - Very high tolerance

**Example:**
```json
{
  "diffThreshold": 0.15
}
```

**When to adjust:**
- Increase for pages with dynamic content
- Decrease for pixel-perfect comparisons
- Adjust based on false positive rate

### `parallel`

**Type:** `boolean`
**Required:** No
**Default:** `true`

Enable parallel test execution.

**Behavior:**
- `true` - Run multiple tests concurrently
- `false` - Run tests sequentially

**Example:**
```json
{
  "parallel": true
}
```

**When to disable:**
- Debugging test failures
- Limited system resources
- Rate limit concerns

### `maxConcurrency`

**Type:** `number`
**Required:** No
**Default:** `5`
**Range:** `1` - `∞`

Maximum number of parallel test executions.

**Recommendations:**
- **Low resources:** `3-5`
- **Standard:** `5-10`
- **High performance:** `10-20`
- **CI environment:** `5-10`

**Example:**
```json
{
  "maxConcurrency": 10
}
```

## Configuration Examples

### Minimal Configuration

```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000"
}
```

### Complete Configuration

```json
{
  "aiProvider": "claude",
  "claudeApiKey": "sk-ant-api03-...",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src",
  "outputDir": "visual-tests",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "diffThreshold": 0.15,
  "parallel": true,
  "maxConcurrency": 10
}
```

### Mobile Testing Configuration

```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "viewport": {
    "width": 375,
    "height": 812
  },
  "diffThreshold": 0.2,
  "outputDir": "mobile-tests"
}
```

### CI Configuration

```json
{
  "aiProvider": "claude",
  "liveUrl": "https://staging.example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src/pages",
  "outputDir": "ci-results",
  "parallel": true,
  "maxConcurrency": 5,
  "diffThreshold": 0.1
}
```

### High-Tolerance Configuration

For pages with lots of dynamic content:

```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "diffThreshold": 0.5,
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

## Configuration Priority

When multiple configuration sources exist:

1. **CLI Options** (highest priority)
2. **Config File** (`.lastestrc.json`)
3. **Environment Variables**
4. **Interactive Prompts**
5. **Defaults** (lowest priority)

## Environment Variables

All config options can be set via environment variables:

```bash
export LASTEST_AI_PROVIDER=claude
export LASTEST_LIVE_URL=https://example.com
export LASTEST_DEV_URL=http://localhost:3000
export LASTEST_SCAN_PATH=./src
export LASTEST_OUTPUT_DIR=results
export LASTEST_DIFF_THRESHOLD=0.1
export LASTEST_PARALLEL=true
export LASTEST_MAX_CONCURRENCY=10
export LASTEST_VIEWPORT_WIDTH=1920
export LASTEST_VIEWPORT_HEIGHT=1080
```

## Validation

lastest validates configuration on startup:

**Checks:**
- ✅ Required fields present
- ✅ URLs are valid
- ✅ Scan path exists
- ✅ Numeric values in range
- ✅ API keys have correct format

**Error messages:**
- Clear indication of what's wrong
- Suggestions for fixes
- Links to documentation

## Best Practices

1. **Use config file for projects**
   - Version control friendly
   - Team consistency
   - Easy to maintain

2. **Use CLI options for one-offs**
   - Quick tests
   - Experimentation
   - Override config values

3. **Use env vars for secrets**
   - Never commit API keys
   - Use `.env` files
   - CI/CD integration

4. **Document team configs**
   - Add comments in README
   - Provide examples
   - Explain custom values

5. **Different configs for different environments**
   - `.lastestrc.dev.json`
   - `.lastestrc.staging.json`
   - `.lastestrc.ci.json`

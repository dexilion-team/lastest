# 🚀 lasTest

> AI-powered automated visual testing CLI that compares live vs dev environments

[![CI](https://github.com/yourusername/lastest/workflows/CI/badge.svg)](https://github.com/yourusername/lastest/actions)
[![npm version](https://badge.fury.io/js/lastest.svg)](https://www.npmjs.com/package/lastest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**lasTest** automatically scans your codebase, generates Playwright tests using AI, and runs visual regression tests comparing your live and development environments. Get comprehensive reports with side-by-side screenshots and visual diffs.

## ✨ Features

- 🤖 **AI-Powered Test Generation** - Uses Claude Pro/Max or GitHub Copilot subscription to generate intelligent tests
- 📝 **Template Mode** - Skip AI entirely for simple screenshot tests (faster, no AI costs)
- 🔍 **Smart Route Detection** - Automatically discovers pages from Next.js, React Router, Vue Router, and more
- 🧠 **AI Route Detection** - Optional AI-powered route discovery for complex routing patterns
- 🎯 **Custom Test Instructions** - Add your own AI instructions (e.g., "Click buttons, fill forms")
- 📸 **Visual Regression Testing** - Captures and compares screenshots with pixel-perfect accuracy
- 🎨 **Beautiful Tabbed Reports** - Interactive HTML reports with Visual Comparison, Test Results, and Playwright views
- 🎭 **Detailed Step Logging** - AI tests log execution steps (navigation, interactions, screenshots)
- ⚡ **Parallel Execution** - Run tests concurrently for blazing-fast results
- 🔧 **Highly Configurable** - Customize everything via `.lastestrc.json`
- 💾 **Test Caching** - Generated tests are cached for fast re-runs without AI calls
- 📊 **Error Tracking** - Comprehensive error logging with email notifications support

## 🚀 Quick Start

### Prerequisites

You'll need one of the following:
- **Claude Pro or Claude Max subscription** + Claude CLI installed
- **GitHub Copilot subscription** (Pro/Business/Enterprise) + Copilot CLI installed (requires Node.js 22+)

### Setup

```bash
npx lasTest init
```

That's it! The CLI will guide you through:

1. **AI Provider** - Choose between Claude Subscription or GitHub Copilot
2. **URLs** - Provide your live and dev URLs
3. **Automated Testing** - Sit back while lasTest does the work

## 📦 Installation

### Global Installation

```bash
npm install -g lastest
```

### Local Installation

```bash
npm install --save-dev lastest
```

### npx (No Installation)

```bash
npx lasTest init
```

## 📖 Usage

### Initial Setup

Run this to create your configuration and generate tests:

```bash
lasTest init
```

This will:
- Guide you through AI provider setup (Claude Subscription or Copilot Subscription)
- Scan your codebase for routes
- Generate tests using AI
- Create `.lastestrc.json` (config) and `.lastest-tests.json` (cached tests)
- Run the test suite

### Re-running Tests

Once configured and tests are generated, simply run:

```bash
lasTest
```

This will:
- Load your existing configuration and cached tests
- **Skip AI generation** (uses cached tests for faster execution)
- Run tests against both environments
- Generate a fresh report

### Regenerating Tests

To update your configuration or regenerate tests with AI:

```bash
lasTest init
```

When you have an existing config, it will ask if you want to update it. This regenerates tests from scratch.

### With Options

```bash
lasTest init \
  --live https://example.com \
  --dev http://localhost:3000 \
  --ai claude-subscription \
  --scan ./src
```

### Using Config File

The `.lastestrc.json` file is automatically created during `init`:

```json
{
  "aiProvider": "claude-subscription",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src",
  "outputDir": "lastest-results",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "diffThreshold": 0.1,
  "parallel": true,
  "maxConcurrency": 5
}
```

Or with GitHub Copilot:

```json
{
  "aiProvider": "copilot-subscription",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000"
}
```

Then run:

```bash
lasTest init
```

## 🎯 How It Works

### AI Mode (Default)
1. **Scan** - Analyzes your codebase to discover all routes/pages
2. **Generate** - Uses AI to create intelligent Playwright tests with step logging
3. **Cache** - Saves generated tests to `.lastest-tests.json` for fast re-runs
4. **Execute** - Runs tests against both live and dev environments with detailed step tracking
5. **Compare** - Performs pixel-perfect comparison of screenshots
6. **Report** - Generates tabbed HTML report with Visual Comparison, Test Results, and Playwright views

**AI Test Execution:**
- Tests are transpiled from TypeScript to JavaScript at runtime
- Executed in a secure VM sandbox with Playwright APIs
- Step logging tracks navigation, interactions, and screenshot capture
- Fallback to simple screenshot test only if screenshot is missing
- Failed tests are marked as failed (no silent fallback)

### Template Mode (No AI)
1. **Scan** - Analyzes your codebase to discover all routes/pages
2. **Generate** - Creates simple screenshot tests from templates (no AI calls)
3. **Cache** - Saves generated tests to `.lastest-tests.json` for fast re-runs
4. **Execute** - Runs tests against both live and dev environments
5. **Compare** - Performs pixel-perfect comparison of screenshots
6. **Report** - Generates tabbed HTML report with Visual Comparison, Test Results, and Playwright views

**When to use Template Mode:**
- You want fast test generation without AI costs
- You only need basic screenshot comparisons
- You don't need custom interactions (button clicks, form fills, etc.)

## 💳 AI Provider Options

**lasTest** supports two AI options - choose based on what you already have:

| Option | Cost | Setup | Best For |
|--------|------|-------|----------|
| **Claude Subscription** | Included with Pro/Max ($20-$200/mo) | CLI authentication | Existing Claude Pro/Max users |
| **GitHub Copilot** | Included with subscription ($10-$19/mo) | CLI authentication | Existing Copilot users |

### Using Claude Pro/Max Subscription

```bash
# One-time setup
npm install -g @anthropic-ai/claude-code
claude login

# Then use lasTest
lasTest init --ai claude-subscription
```

### Using GitHub Copilot Subscription

```bash
# One-time setup (requires Node.js 22+)
npm install -g @github/copilot

# Authenticate (choose one):
# Option 1: Interactive login
copilot
# Then use /login command

# Option 2: Use GitHub token
export GITHUB_TOKEN=your_token

# Then use lasTest
lasTest init --ai copilot-subscription
```

## 📊 Output

After running, you'll get:

```
lastest-results/
├── report.html          # Interactive HTML report with tabbed view
├── summary.md           # Markdown summary
├── screenshots/
│   ├── live/           # Live environment screenshots
│   └── dev/            # Dev environment screenshots
├── diffs/              # Visual difference images
├── tests/              # Generated test files
├── playwright-report/  # Playwright-compatible test report
│   ├── index.html     # Detailed test execution report
│   └── report.json    # Test results data
└── data.json           # Raw test data
```

## 🎨 Report Preview

The HTML report includes a **tabbed interface** with three views:

### 📸 Visual Comparison Tab
- Side-by-side screenshot comparisons (live vs dev)
- Visual diff highlighting with pixel difference percentage
- Per-route comparison details
- Environment-specific pass/fail statistics

### 📊 Test Results Tab
- Overall test summary with pass/fail counts
- Environment breakdown (Live vs Dev)
- Per-route test status
- Test execution metrics

### 🎭 Playwright Report Tab
- Standard Playwright test report format
- Detailed step-by-step execution logs
- Test timing and performance metrics
- Error stack traces and debugging info
- Visual step indicators (✓ passed, ✗ failed)

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `testGenerationMode` | `'ai' \| 'template'` | `'ai'` | Test generation mode (AI or template) |
| `aiProvider` | `'claude-subscription' \| 'copilot-subscription'` | `'claude-subscription'` | AI provider for test generation (when mode is 'ai') |
| `useAIRouteDetection` | `boolean` | `false` | Use AI to detect routes (more accurate but slower) |
| `customTestInstructions` | `string` | - | Custom instructions for AI test generation (e.g., "Click buttons, fill forms") |
| `liveUrl` | `string` | - | Live environment URL |
| `devUrl` | `string` | - | Development environment URL |
| `scanPath` | `string` | `'.'` | Path to scan for routes |
| `outputDir` | `string` | `'lastest-results'` | Output directory for results |
| `viewport` | `object` | `{width: 1920, height: 1080}` | Browser viewport size |
| `diffThreshold` | `number` | `0.1` | Pixel difference threshold (0-1) |
| `parallel` | `boolean` | `true` | Run tests in parallel |
| `maxConcurrency` | `number` | `5` | Max parallel test executions |

## 🌐 Framework Support

**lastest** automatically detects and supports:

- ✅ **Next.js** (App Router & Pages Router)
- ✅ **React Router** (v6+)
- ✅ **Vue Router** (v4+)
- ✅ **Generic HTML/Static Sites**

## 🤖 AI Providers

### Claude Subscription (Pro/Max)

```bash
# One-time global setup
npm install -g @anthropic-ai/claude-code
claude login

# Use in any project
lasTest init --ai claude-subscription
```

- **Cost**: Included with Claude Pro ($20/mo) or Max ($200/mo annual)
- **Setup**: Browser authentication via Claude CLI
- **Best for**: Existing Claude subscribers, unlimited usage within plan limits

### GitHub Copilot Subscription

```bash
# One-time global setup (requires Node.js 22+)
npm install -g @github/copilot

# Authenticate with /login or GITHUB_TOKEN
copilot
# Then enter: /login

# Use in any project
lasTest init --ai copilot-subscription
```

- **Cost**: Included with Copilot Pro ($10/mo), Business ($19/user/mo), or Enterprise
- **Setup**: Interactive /login or GITHUB_TOKEN environment variable
- **Best for**: Existing Copilot subscribers
- **Requirements**: Node.js 22+ and npm 10+

## 🔥 Advanced Usage

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Visual Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run visual tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx lasTest init \
            --live https://example.com \
            --dev http://localhost:3000 \
            --ai claude

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: visual-test-results
          path: lastest-results/
```

### Programmatic Usage

```typescript
import { Scanner, TestGenerator, TestRunner, ReportGenerator } from 'lastest';

const config = {
  aiProvider: 'claude',
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  liveUrl: 'https://example.com',
  devUrl: 'http://localhost:3000',
  scanPath: '.',
  outputDir: 'lastest-results',
};

const scanner = new Scanner(config.scanPath);
const routes = await scanner.scan();

const generator = new TestGenerator(config);
const tests = await generator.generateTests(routes);

const runner = new TestRunner(config);
const results = await runner.runTests(tests);

const reporter = new ReportGenerator(config);
await reporter.generate(results);
```

## 🐛 Troubleshooting

### Tests Failing

- Ensure both URLs are accessible
- Check that dev server is running
- Verify network connectivity

### API Key Issues

```bash
# Set Claude API key
export ANTHROPIC_API_KEY=your-key

# Or add to .lastestrc.json
{
  "claudeApiKey": "your-key"
}
```

### Screenshot Differences

- Adjust `diffThreshold` in config
- Check for dynamic content (dates, random elements)
- Consider viewport size consistency

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT © [lastest contributors](LICENSE)

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/)
- Powered by [Claude](https://www.anthropic.com/) and [GitHub Copilot](https://github.com/features/copilot)
- Inspired by the need for automated visual regression testing

## 📬 Support

- 🐛 [Report a Bug](https://github.com/yourusername/lastest/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/yourusername/lastest/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/yourusername/lastest/discussions)

---

Made with ❤️ by the open-source community

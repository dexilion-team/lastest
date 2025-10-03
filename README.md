# 🚀 lasTest

> AI-powered automated visual testing CLI that compares live vs dev environments

[![CI](https://github.com/yourusername/lastest/workflows/CI/badge.svg)](https://github.com/yourusername/lastest/actions)
[![npm version](https://badge.fury.io/js/lastest.svg)](https://www.npmjs.com/package/lastest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**lasTest** automatically scans your codebase, generates Playwright tests using AI, and runs visual regression tests comparing your live and development environments. Get comprehensive reports with side-by-side screenshots and visual diffs.

## ✨ Features

- 🤖 **AI-Powered Test Generation** - Uses Claude Pro/Max or GitHub Copilot subscription to generate intelligent tests
- 🔍 **Smart Route Detection** - Automatically discovers pages from Next.js, React Router, Vue Router, and more
- 📸 **Visual Regression Testing** - Captures and compares screenshots with pixel-perfect accuracy
- 🎨 **Beautiful Reports** - Interactive HTML reports with side-by-side comparisons
- ⚡ **Parallel Execution** - Run tests concurrently for blazing-fast results
- 🎯 **Zero Configuration** - Works out of the box with sensible defaults
- 🔧 **Highly Configurable** - Customize everything via `.lastestrc.json`
- 💾 **Test Caching** - Generated tests are cached for fast re-runs without AI calls

## 🚀 Quick Start

### Prerequisites

You'll need one of the following:
- **Claude Pro or Claude Max subscription** + Claude CLI installed
- **GitHub Copilot subscription** + Copilot CLI installed

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

1. **Scan** - Analyzes your codebase to discover all routes/pages
2. **Generate** - Uses AI to create intelligent Playwright tests for each page
3. **Execute** - Runs tests against both live and dev environments
4. **Compare** - Performs pixel-perfect comparison of screenshots
5. **Report** - Generates beautiful HTML and Markdown reports

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
# One-time setup
npm install -g @github/copilot-cli
gh auth login  # or use: copilot (then /login)

# Then use lasTest
lasTest init --ai copilot-subscription
```

## 📊 Output

After running, you'll get:

```
lastest-results/
├── report.html          # Interactive HTML report
├── summary.md           # Markdown summary
├── screenshots/
│   ├── live/           # Live environment screenshots
│   └── dev/            # Dev environment screenshots
├── diffs/              # Visual difference images
├── tests/              # Generated test files
└── data.json           # Raw test data
```

## 🎨 Report Preview

The HTML report includes:
- ✅ Overall test summary with pass/fail counts
- 📸 Side-by-side screenshot comparisons
- 🎯 Visual diff highlighting with percentage
- 📊 Per-route comparison details
- ⚡ Test execution metrics

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `aiProvider` | `'claude-subscription' \| 'copilot-subscription'` | `'claude-subscription'` | AI provider for test generation |
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
# One-time global setup
npm install -g @github/copilot-cli
gh auth login

# Use in any project
lasTest init --ai copilot-subscription
```

- **Cost**: Included with Copilot Pro ($10/mo), Business ($19/user/mo), or Enterprise
- **Setup**: GitHub authentication via gh CLI or Copilot CLI
- **Best for**: Existing Copilot subscribers

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

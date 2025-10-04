# lasTest Test Suite

Comprehensive test suite for the lasTest automated visual testing tool.

## Overview

This test suite validates all functionality of lasTest using the real **dexilion.com** project located at `/home/wyctor/dexilion.com/`.

## Test Structure

```
tests/
├── helpers/              # Test utilities and mocks
│   ├── test-utils.ts    # Common test utilities
│   ├── mocks.ts         # Mock data and classes
│   └── dexilion-server.ts  # Dev server management
├── unit/                 # Unit tests
│   ├── config.test.ts
│   ├── scanner.test.ts
│   ├── generator.test.ts
│   ├── runner.test.ts
│   ├── differ.test.ts
│   ├── reporter.test.ts
│   └── test-cache.test.ts
├── integration/         # Integration tests
│   ├── init-workflow.test.ts
│   └── workflow.test.ts (run workflow)
└── e2e/                 # End-to-end tests
    ├── dexilion.test.ts
    └── custom-instructions.test.ts
```

## Test Configuration

### URLs
- **Live URL**: `https://dexilion.com/` (production)
- **Dev URL**: `http://localhost:3000` (local development server)
- **Scan Path**: `/home/wyctor/dexilion.com/`

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/e2e/dexilion.test.ts

# Run unit tests only
npm test tests/unit/

# Run E2E tests only
npm test tests/e2e/

# Run with coverage
npm test -- --coverage
```

## Test Categories

### Unit Tests
Test individual components in isolation:
- **ConfigManager**: Configuration loading, saving, and validation
- **Scanner**: Route detection for all framework types (Next.js, React Router, Vue Router)
- **TestGenerator**: AI and template-based test generation
- **TestRunner**: Parallel and sequential test execution
- **Differ**: Screenshot comparison with pixelmatch
- **ReportGenerator**: HTML, Markdown, and JSON report generation
- **TestCache**: Test caching and persistence

### Integration Tests
Test complete workflows:
- **Init Workflow**: scan → generate → cache → run → report
- **Run Workflow**: load config → load cache → run → report

### E2E Tests

#### dexilion.test.ts
Comprehensive tests covering all configuration options:
1. AI mode + Claude + traditional scanning
2. Template mode + custom viewport
3. Parallel vs sequential execution
4. Different diffThreshold values
5. Router type detection
6. Config persistence
7. Full init → run workflow
8. Static routes filtering
9. Output file structure
10. Custom test instructions

#### custom-instructions.test.ts
Tests custom interaction instructions:
- Newsletter subscription interactions
- Contact form testing
- Button and CTA interactions
- Modal and popup handling
- Navigation and scroll interactions
- Comprehensive multi-step scenarios

## Test Configuration Options Covered

All tests validate the following configuration combinations:

### Test Generation Modes
- ✅ `testGenerationMode: 'ai'` - AI-powered test generation
- ✅ `testGenerationMode: 'template'` - Template-based generation

### AI Providers
- ✅ `aiProvider: 'claude-subscription'`
- ✅ `aiProvider: 'copilot-subscription'`

### Execution Modes
- ✅ `parallel: true` with `maxConcurrency: 3/5`
- ✅ `parallel: false` (sequential)

### Route Detection
- ✅ `useAIRouteDetection: true` - AI-powered route discovery
- ✅ `useAIRouteDetection: false` - Traditional scanning

### Router Types
- ✅ Hash router (`/#/route`)
- ✅ Browser router (`/route`)

### Custom Options
- ✅ `customTestInstructions` - Newsletter, forms, buttons, modals
- ✅ `viewport: { width, height }` - Custom viewport sizes
- ✅ `diffThreshold: 0.01 - 0.5` - Pixel difference sensitivity

## Prerequisites

### Required Setup
1. **dexilion.com project** must exist at `/home/wyctor/dexilion.com/`
2. **Local dev server** must be startable with `npm run dev`
3. **Playwright** must be installed

### Optional (for AI tests)
- Claude CLI: `npm install -g @anthropic-ai/claude-code && claude login`
- GitHub Copilot: `npm install -g @github/copilot` (Node.js 22+)

## Custom Instructions Test Cases

The test suite validates the following interaction scenarios:

### Newsletter Subscription
```typescript
customTestInstructions: 'Click newsletter button, fill email with test@example.com, submit'
```

### Contact Form
```typescript
customTestInstructions: 'Fill contact form: name=Test User, email=contact@test.com, click submit'
```

### Button Interactions
```typescript
customTestInstructions: 'Click all CTA buttons, verify modals open'
```

### Comprehensive Scenario
```typescript
customTestInstructions: `
  1. Newsletter: Click subscribe, enter email, submit
  2. Contact: Fill form, submit
  3. Buttons: Click all CTAs
  4. Forms: Test validation
  5. Modals: Open and close
  6. Navigation: Test menu links
`
```

## Expected Output Structure

After running tests, the output directory should contain:

```
lastest-results/
├── tests/              # Generated test files
│   ├── home.ts
│   ├── about.ts
│   └── contact.ts
├── screenshots/
│   ├── live/          # Production screenshots
│   └── dev/           # Dev server screenshots
├── diffs/             # Visual diff images
├── report.html        # Interactive HTML report
├── summary.md         # Markdown summary
└── data.json          # Raw JSON data
```

## Notes

- E2E tests start a local dev server automatically (timeout: 60s)
- Tests using the real dexilion.com project are skipped if path doesn't exist
- Template mode is used in place of AI mode in tests to avoid authentication requirements
- All tests clean up after themselves using `cleanTestOutput()`

## Troubleshooting

### Tests Timing Out
- Increase timeout in test: `it('test name', async () => { ... }, 120000)`
- Check if dev server is starting properly

### Dev Server Fails to Start
- Verify dexilion.com project exists
- Check if port 3000 is available
- Run `npm install` in dexilion.com directory

### Missing Screenshots
- Ensure Playwright is installed: `npx playwright install chromium`
- Check output directory permissions

### Cache Issues
- Clear test cache: manually delete `.lastest-tests.json`
- Clean output: delete `tests/.test-output/` directory

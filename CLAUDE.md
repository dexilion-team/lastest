# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lasTest** (displayed as "lasTest" in UI, package name "lastest") is an AI-powered CLI tool for automated visual regression testing. It compares live vs dev environments by:
1. Scanning codebases to discover routes
2. Generating Playwright tests using AI (Claude or Copilot)
3. Running tests against both environments
4. Creating visual diff reports

## Development Commands

```bash
# Build TypeScript to dist/
npm run build

# Watch mode for development
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

### Core Workflow Pipeline

The tool follows a strict 5-stage pipeline orchestrated by `src/commands/init.ts` and `src/commands/run.ts`:

1. **Scan** → `Scanner` detects routes from framework-specific files
2. **Generate** → `TestGenerator` uses AI to create Playwright tests
3. **Cache** → `TestCache` saves generated tests to `.lastest-tests.json`
4. **Execute** → `TestRunner` runs tests against both URLs
5. **Report** → `ReportGenerator` + `Differ` create visual comparison reports

### Key Architectural Patterns

#### Two-Command Model
- **`lastest init`**: Full pipeline with AI generation (scan → generate → cache → run → report)
- **`lastest`**: Fast re-runs using cached tests (load cache → run → report, **no AI calls**)

This separation allows users to:
- Run `init` once to generate tests with AI
- Run `lastest` repeatedly for fast test execution without AI costs

#### AI Provider Abstraction
Both AI clients (`ClaudeSubscriptionClient`, `CopilotSubscriptionClient`) implement:
```typescript
async generateTest(route: RouteInfo): Promise<string>  // Generate test code
async testConnection(): Promise<void>                   // Verify auth
```

Selection happens in `TestGenerator` constructor via switch statement on `config.aiProvider`.

**Important**: Only subscription-based providers are supported:
- `claude-subscription`: Uses `@anthropic-ai/claude-agent-sdk` with CLI auth
- `copilot-subscription`: Uses `@github/copilot` (requires Node.js 22+)

#### Framework Detection Strategy
`Scanner` detects project type by searching parent directories (up to 3 levels) for `package.json`:
- Next.js App Router: `/app` directory exists
- Next.js Pages Router: `/pages` directory exists
- React Router: `react-router-dom` dependency
- Vue Router: `vue-router` dependency

Dynamic routes are detected but **skipped** during test generation (they need example data).

### Configuration Files

Three files control behavior (all in current working directory):

1. **`.lastestrc.json`** - User config (URLs, AI provider, viewport, etc.)
   - Created by `ConfigManager.save()`
   - Loaded by `ConfigManager.load()`
   - New configuration options:
     - `testGenerationMode`: 'ai' | 'template' | 'mcp' (default: 'ai')
     - `useAIRouteDetection`: boolean (default: false)
     - `customTestInstructions`: string (optional)

2. **`.lastest-tests.json`** - Cached generated tests
   - Created by `TestCache.save(tests)` after AI or template generation
   - Loaded by `TestCache.load()` for fast re-runs
   - Contains array of `TestCase` objects with generated code

3. **`lastest-results/`** - Output directory
   - `tests/` - Generated test files
   - `screenshots/` - Live and dev screenshots
   - `diffs/` - Visual diff images
   - `report.html` - Tabbed HTML report (Visual Comparison, Test Results, Playwright)
   - `summary.md` - Markdown summary
   - `playwright-report/` - Playwright-compatible report with step-by-step execution
   - `data.json` - Raw test data

### Important Implementation Details

#### Branding Consistency
- UI displays: "lasTest" (capital T)
- Package name: "lastest"
- Config files: `.lastestrc.json`, `.lastest-tests.json`

#### AI Client Specifics

**Claude Subscription Client:**
- Uses `query()` from `@anthropic-ai/claude-agent-sdk`
- Returns `AsyncIterator<SDKMessage>`
- Auth: `claude login` (one-time browser auth)
- Extract text from `message.message.content` blocks

**Copilot Subscription Client:**
- Uses `copilot` CLI command directly (shell exec)
- Package: `@github/copilot` (NOT `@github/copilot-cli`)
- Command: `copilot -p "prompt" --allow-all-tools` (requires `--allow-all-tools` for non-interactive mode)
- Auth: `/login` command or `GITHUB_TOKEN` env var
- Requires: Node.js 22+ and npm 10+

#### Test Generation Flow
1. Scanner finds routes → filters out dynamic routes
2. AI client receives route metadata (path, type, filePath)
3. Prompt includes Playwright best practices + export signature + stepLogger instructions
4. Response extracted from markdown code blocks
5. Code saved to `lastest-results/tests/{route-name}.ts`
6. TestCase objects stored in cache

#### Test Execution Flow (AI Mode)
**Critical**: AI-generated tests ARE executed when `testGenerationMode='ai'`:

1. **Transpilation**: TypeScript test code transpiled to JavaScript using `typescript.transpileModule()`
2. **Sandbox Creation**: VM sandbox created with:
   - `page`: Playwright Page object
   - `baseUrl`: Environment URL
   - `screenshotPath`: Output screenshot path
   - `stepLogger`: Step tracking utility (logs navigation, interactions, screenshots)
   - `require()`: Provides Playwright module, Node.js built-ins (path, fs)
   - `console`: Standard console for debugging
3. **Execution**: Test function executed via `vm.runInContext()` with 60s timeout
4. **Step Tracking**: `StepTracker` utility captures each logged step with timing
5. **Screenshot Verification**: After execution, checks if screenshot file exists
6. **Fallback Logic**:
   - **Only runs if screenshot is missing** (not on any test failure)
   - Executes simple `executeSimpleTest()` (navigate → wait → screenshot)
   - **Always marks as FAILED** if fallback runs
   - Error message: "Screenshot not generated by AI test, fallback used"
7. **Error Handling**:
   - Test errors capture steps executed before failure
   - Steps attached to error object for reporting
   - Timeout errors detected and logged separately

**Important**: Hardwired tests only run as fallback or in template mode, NOT in normal AI mode execution.

#### Dependency Management & Auto-Installation
`init.ts` includes automatic dependency verification and installation:
- **Playwright**: Auto-installs on first run if missing
- **AI CLIs**: Checks and offers installation based on selected provider:
  - Claude CLI: Offers `npm install -g @anthropic-ai/claude-code`
  - GitHub Copilot CLI: Offers `npm install -g @github/copilot`
- Only installs dependencies needed for the selected AI provider
- `ensureAIDependency()` runs before `verifyAISetup()` to ensure CLI is available

#### Configuration Flow Improvements
- **No config found**: `lastest` (run command) automatically triggers `lastest init`
- **Existing config**: `lastest init` prepopulates all answers with existing values (no "update?" prompt)
- **No cached tests**: Running `lastest` triggers full `init` pipeline
- Authentication prompts removed (auto-checked via `ensureAIDependency()` and `verifyAISetup()`)

#### Visual Diff Calculation
`differ.ts` uses pixelmatch for screenshot comparison:
- Calculates `diffPercentage = (numDiffPixels / totalPixels) * 100`
- **Important**: `hasDifferences` threshold is `> 0.01%` (not `> 0`)
  - Prevents false positives from sub-pixel anti-aliasing differences
  - Identical-looking screens with minor rendering differences show as "No differences"
- Diff images only generated when `hasDifferences === true`

## Module Structure

```
src/
├── cli.ts                       # Commander.js entry point
├── commands/
│   ├── init.ts                  # Full pipeline with AI/template generation
│   └── run.ts                   # Fast re-run using cached tests
├── ai/
│   ├── claude-subscription.ts   # Claude Agent SDK client (with custom instructions)
│   └── copilot-subscription.ts  # Copilot CLI client (with custom instructions)
├── utils/
│   ├── logger.ts                # Console output and formatting utilities
│   ├── error-logger.ts          # Error capture and email notification support
│   └── step-tracker.ts          # Test step tracking with automatic timing
├── scanner.ts                   # Framework-specific route detection + AI detection
├── generator.ts                 # Test generation orchestrator (AI, template, or MCP mode)
├── template-generator.ts        # Template-based test generator (no AI)
├── mcp-generator.ts             # MCP-enhanced test generator (AI + MCP validation)
├── mcp-validator.ts             # MCP validation and interaction discovery
├── test-cache.ts                # Test persistence layer
├── utils/
│   └── mcp-helper.ts            # MCP installation checks
├── runner.ts                    # Playwright test executor with VM sandbox
├── differ.ts                    # Pixelmatch screenshot comparison
├── reporter.ts                  # Tabbed HTML report generator
├── playwright-reporter.ts       # Playwright-compatible report with steps
├── config.ts                    # ConfigManager for .lastestrc.json
└── types.ts                     # Shared TypeScript interfaces
```

## When Making Changes

### Adding AI Providers
1. Create new client in `src/ai/` implementing `generateTest()` and `testConnection()`
2. Add to union type in `Config.aiProvider` (types.ts)
3. Add switch case in `TestGenerator` constructor and `verifyAISetup()`
4. Add inquirer prompt in `getConfigAnswers()` (init.ts)

### Adding Framework Support
1. Add detection logic in `Scanner.detectProjectType()`
2. Implement route scanning method (e.g., `scanNextJsAppRouter()`)
3. Add to switch statement in `Scanner.scan()`

### Modifying Test Cache Format
- Update `TestCase` interface in types.ts
- Version the cache file or add migration logic
- Update both `TestCache.save()` and `TestCache.load()`

### Changing Workflow Pipeline
- `init.ts` controls full pipeline (with AI or template generation)
- `run.ts` controls fast re-run (cached tests only)
- Both must maintain the same execution and reporting stages

## Advanced Features

### Test Generation Modes

**AI Mode (default):**
- Uses `ClaudeSubscriptionClient` or `CopilotSubscriptionClient`
- Supports `customTestInstructions` config option
- AI clients accept Config in constructor to access custom instructions
- Prompts are enhanced with custom instructions if provided
- Requires authentication and AI provider setup
- Fast generation, generates re-runnable TypeScript test files

**Template Mode:**
- Uses `TemplateGenerator` class (no AI dependency)
- Generates simple screenshot tests from templates
- Skips AI setup verification in `init.ts`
- Faster generation, no costs, no authentication
- Enabled via `testGenerationMode: 'template'` in config
- Best for basic screenshot comparison without interactions

**MCP Mode (NEW):**
- Uses `MCPGenerator` class (AI + MCP validation)
- Combines AI code generation with real-time MCP validation
- Workflow:
  1. AI generates initial test code (same as AI mode)
  2. MCP validates selectors against live page via Playwright MCP tools
  3. MCP discovers additional interactions (buttons, forms, links)
  4. AI refines test based on MCP feedback
  5. Saves validated TypeScript test file for re-runs
- Benefits:
  - Eliminates selector guessing - validates selectors exist
  - Discovers interactions AI might miss
  - Reduces fallback cases
  - Higher test quality, lower failure rate
- Trade-offs:
  - Slower generation (AI + validation + refinement)
  - Requires Claude CLI and Playwright MCP server
  - Best for critical routes where reliability > speed
- Requirements:
  - `claude` CLI installed and authenticated
  - Playwright MCP installed: `claude mcp add @playwright/mcp@latest`
  - AI provider (Claude or Copilot) for code generation
- Enabled via `testGenerationMode: 'mcp'` in config

Implementation in `generator.ts`:
- Constructor checks `config.testGenerationMode`
- If 'template', instantiates `TemplateGenerator`
- If 'mcp', instantiates `MCPGenerator`
- If 'ai' (default), instantiates appropriate AI client
- `generateTests()` delegates to appropriate generator

**Mode Comparison:**

| Feature | AI Mode | Template Mode | MCP Mode |
|---------|---------|---------------|----------|
| Speed | Fast | Fastest | Slow |
| Cost | AI tokens | Free | AI tokens (2x) |
| Selector validation | No | N/A | Yes |
| Interaction discovery | No | No | Yes |
| Reliability | Medium | Low | High |
| Re-runnable tests | Yes | Yes | Yes |
| Setup complexity | Medium | Low | High |

### AI Route Detection

**Traditional Scanning:**
- Framework-specific glob patterns and regex
- Fast, works for most standard projects

**AI-Powered Detection:**
- Enabled via `useAIRouteDetection: true` in config
- `Scanner` checks this flag in `scan()` method
- Calls `aiDetectRoutes()` which:
  1. Finds relevant routing files (routes, router, pages, app)
  2. Sends file contents to Claude Agent SDK
  3. Asks AI to extract route definitions as JSON
  4. Parses response to RouteInfo array
  5. Falls back to traditional scanning on error

Benefits: Detects complex routing patterns, custom routers, micro-frontends

### Custom Test Instructions

- Config option: `customTestInstructions: string`
- Added to AI client prompts in `buildPrompt()`
- Allows users to specify interactions: "Click buttons, fill forms, verify animations"
- AI generates tests with these instructions included
- Template mode documents but doesn't execute instructions

Setup flow in `init.ts`:
- Added conditional prompts based on `testGenerationMode`
- Template mode skips AI provider and custom instructions prompts
- AI mode shows all configuration options

## Common Development Patterns

### Testing the CLI Locally

```bash
# Build and test
npm run build
node dist/cli.js init

# Or use the binary directly
./dist/cli.js init
```

### Adding New Configuration Options

1. Add to `Config` interface in `types.ts`
2. Add default value in `ConfigManager.getDefaultConfig()` (config.ts)
3. Add inquirer prompt in `getConfigAnswers()` (init.ts)
4. Use in relevant modules (generator, scanner, runner, etc.)

### Debugging AI Client Issues

- Check CLI installation: `claude --version` or `copilot --version`
- Test authentication: `testConnection()` method in AI client
- Enable verbose logging by adding console.log in `generateTest()`
- For Copilot: Ensure `--allow-all-tools` flag is present in command

### MCP Mode Implementation Details

**MCPValidator** (`src/mcp-validator.ts`):
- Validates AI-generated test selectors against real pages
- Discovers additional interactions (buttons, forms, links)
- Returns `ValidationResult` with selector validation and suggestions

Key methods:
```typescript
async validateTest(route, generatedCode, baseUrl): Promise<ValidationResult>
async verifySelectors(selectors, pageUrl): Promise<SelectorValidation>
async discoverInteractions(pageUrl): Promise<Interaction[]>
```

**MCPGenerator** (`src/mcp-generator.ts`):
- Orchestrates AI generation + MCP validation + AI refinement
- Flow:
  1. Call `aiClient.generateTest(route)` - initial code
  2. Call `mcpValidator.validateTest(route, code, liveUrl)` - validate
  3. If issues found, call `aiClient.refineTest(route, code, validation)` - refine
  4. Save final TypeScript file

**AI Client Extensions**:
Both `ClaudeSubscriptionClient` and `CopilotSubscriptionClient` now implement:
```typescript
async refineTest(route, originalCode, validation): Promise<string>
```
- Takes original code and MCP validation feedback
- Generates refined test fixing selectors and adding interactions
- Falls back to original code on error

**MCP Helper** (`src/utils/mcp-helper.ts`):
- Checks if Claude CLI is available
- Checks if Playwright MCP is installed
- Provides installation instructions

## Reporting Architecture

### Tabbed Report Structure
The main report (`report.html`) uses a tabbed interface with three views:

1. **Visual Comparison Tab**: Side-by-side screenshots with diff highlighting
   - Environment-specific pass/fail statistics
   - Per-route comparison details
   - Visual diff images with pixel percentage

2. **Test Results Tab**: Overall test breakdown
   - Total pass/fail counts per environment
   - Per-route test status
   - Test execution metrics

3. **Step-by-Step Comparison Tab**: Embedded iframe showing `playwright-report/index.html`
   - Two-column layout comparing live vs dev environments side-by-side
   - Route-based grouping (not environment-based suites)
   - Step-by-step execution logs for both environments in parallel
   - Visual step indicators (✓ passed, ✗ failed)
   - Error stack traces and screenshot links for each environment

### Step Logging System
**StepTracker** (`utils/step-tracker.ts`) captures test execution steps:

```typescript
export class StepTracker {
  log(title: string): void           // Start new step, auto-finalize previous
  markCurrentStepFailed(error: string): void  // Mark current step as failed
  getSteps(): TestStep[]             // Get all steps with timing
}
```

**Usage in AI tests**:
```typescript
stepLogger.log('Navigating to page');
await page.goto(url);

stepLogger.log('Found submit button');
await page.click('#submit');

stepLogger.log('Screenshot taken');
await page.screenshot({ path: screenshotPath });
```

**Step rendering**:
- Steps shown in Playwright report with duration and status
- Failed steps include error messages
- Automatic timing calculation (difference between log calls)

### Error Tracking
**ErrorLogger** (`utils/error-logger.ts`) provides centralized error capture:

```typescript
Logger.captureError(error, context)  // Capture and log errors
ErrorLogger.setConfig(config)         // Configure email notifications (future)
```

Errors are:
- Logged to console with context
- Stored with stack traces
- Included in DetailedTestExecution results
- Displayed in Playwright report

## Key Files for Specific Features

### AI Prompt Engineering
- `src/ai/claude-subscription.ts:131-188` - Claude prompt template
- `src/ai/copilot-subscription.ts:131-188` - Copilot prompt template
- Both include stepLogger instructions and anti-selector-guessing warnings

### VM Sandbox Execution
- `src/runner.ts:281-394` - `executeAIGeneratedTest()` method
- `src/runner.ts:300-330` - Sandbox creation with modules and stepLogger
- `src/runner.ts:336-352` - Test execution with timeout

### Screenshot Verification & Fallback
- `src/runner.ts:110-147` - Screenshot existence check after test
- `src/runner.ts:113-146` - Fallback execution when screenshot missing
- `src/runner.ts:179-198` - Screenshot check after error
- Always marks fallback cases as FAILED

### Step-by-Step Comparison Report Generation
- `src/playwright-reporter.ts` - Full report generation with live/dev comparison
- `src/playwright-reporter.ts:77-93` - Route grouping logic (groups by route, not environment)
- `src/playwright-reporter.ts:107-498` - Two-column HTML template with side-by-side comparison
- `src/playwright-reporter.ts:450-469` - Step rendering in parallel for both environments
- `src/reporter.ts:617` - Tab label in main report

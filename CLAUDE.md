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
- **`lasTest init`**: Full pipeline with AI generation (scan → generate → cache → run → report)
- **`lasTest`**: Fast re-runs using cached tests (load cache → run → report, **no AI calls**)

This separation allows users to:
- Run `init` once to generate tests with AI
- Run `lasTest` repeatedly for fast test execution without AI costs

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
     - `testGenerationMode`: 'ai' | 'template' (default: 'ai')
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
   - `report.html` / `report.md` - Comparison reports

### Important Implementation Details

#### Branding Consistency
- UI displays: "lasTest" (capital T)
- Package name: "lastest"
- Config files: `.lastestrc.json`, `.lastest-tests.json`
- Binary commands: Both `lastest` and `lasTest` work (aliases in package.json)

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
3. Prompt includes Playwright best practices + export signature
4. Response extracted from markdown code blocks
5. Code saved to `lastest-results/tests/{route-name}.ts`
6. TestCase objects stored in cache

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
├── scanner.ts                   # Framework-specific route detection + AI detection
├── generator.ts                 # Test generation orchestrator (AI or template mode)
├── template-generator.ts        # Template-based test generator (no AI)
├── test-cache.ts                # Test persistence layer
├── runner.ts                    # Playwright test executor
├── differ.ts                    # Pixelmatch screenshot comparison
├── reporter.ts                  # HTML/Markdown report generation
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

**Template Mode:**
- Uses `TemplateGenerator` class (no AI dependency)
- Generates simple screenshot tests from templates
- Skips AI setup verification in `init.ts`
- Faster generation, no costs, no authentication
- Enabled via `testGenerationMode: 'template'` in config

Implementation in `generator.ts`:
- Constructor checks `config.testGenerationMode`
- If 'template', instantiates `TemplateGenerator`
- If 'ai' (default), instantiates appropriate AI client
- `generateTests()` delegates to appropriate generator

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

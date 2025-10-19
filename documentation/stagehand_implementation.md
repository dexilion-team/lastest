# Stagehand AI Generation - Feature Plan

## Overview
Add Stagehand as a 4th test generation mode ('stagehand') that uses AI-powered browser automation to generate more intelligent, interaction-rich tests with hybrid code+AI approach.

## Why Stagehand?

### Package Information
- **GitHub**: browserbase/stagehand
- **Package**: `@browserbasehq/stagehand`
- **Language**: TypeScript (primary), Python SDK available
- **Stars**: ~21K+

### Why It's Perfect for lasTest

✅ **Native TypeScript** - Drop-in integration with existing codebase
✅ **Hybrid Approach** - Mix code (Playwright) with AI when needed
✅ **Production-Ready** - Designed for reliability, not just prototyping
✅ **Playwright-Based** - Already using the same foundation as lasTest
✅ **Cache Actions** - Preview and cache AI actions to save tokens
✅ **LLM Integration** - Works with OpenAI, Anthropic (Claude), and more

### Core Stagehand Methods
```typescript
await stagehand.act("click the submit button");           // AI action
await stagehand.extract({ schema: SomeSchema });          // Extract data
await stagehand.observe("what's on the page?");           // Natural language interpretation
await stagehand.agent("complete the checkout process");   // Multi-step autonomous task
```

## Key Benefits
- **Hybrid Approach**: Mix Playwright code with AI actions when needed
- **Native TypeScript**: Seamless integration with existing codebase
- **Production-Ready**: More reliable than pure AI generation
- **Token Efficient**: Cache actions to reduce AI costs
- **Multi-LLM Support**: Works with OpenAI, Anthropic (Claude), and more
- **Intelligent Interactions**: AI automatically discovers and interacts with page elements
- **Re-runnable Tests**: Generates TypeScript test files that can be cached and re-executed

## Implementation Steps

### 1. Update Dependencies (package.json)
- Add `@browserbasehq/stagehand` to dependencies
- Add `@types/stagehand` to devDependencies (if available)
- Run `npm install` to install new dependencies

### 2. Update Types (src/types.ts)
Extend `testGenerationMode` union type:
```typescript
testGenerationMode?: 'ai' | 'template' | 'mcp' | 'stagehand';
```

Add optional Stagehand-specific config fields:
```typescript
stagehandLLM?: 'openai' | 'anthropic';  // LLM provider for Stagehand
stagehandApiKey?: string;               // API key (optional, can use env vars)
stagehandCacheActions?: boolean;        // Enable action caching (default: true)
```

### 3. Create Stagehand Generator (src/stagehand-generator.ts)
**New file** implementing:

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import { Config, RouteInfo, TestCase } from './types';
import { Logger } from './utils/logger';

/**
 * Stagehand-based Test Generator
 * Generates hybrid AI+code tests using Stagehand
 */
export class StagehandGenerator {
  constructor(private config: Config) {}

  async generateTests(routes: RouteInfo[]): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    const testsDir = path.join(this.config.outputDir, 'tests');

    await fs.ensureDir(testsDir);

    for (const route of routes) {
      // Skip dynamic routes
      if (route.type === 'dynamic') {
        Logger.warn(`Skipping dynamic route: ${route.path}`);
        continue;
      }

      try {
        Logger.dim(`  Generating Stagehand test for ${route.path}...`);
        const code = this.buildStagehandTest(route);

        const testName = this.getTestName(route.path);
        const filePath = path.join(testsDir, `${testName}.ts`);

        await fs.writeFile(filePath, code);

        tests.push({
          name: testName,
          route: route.path,
          code,
          filePath,
          routerType: route.routerType,
        });
      } catch (error) {
        Logger.captureError(
          error as Error,
          `Failed to generate Stagehand test for ${route.path}`
        );
      }
    }

    return tests;
  }

  private buildStagehandTest(route: RouteInfo): string {
    const llmProvider = this.config.stagehandLLM || 'anthropic';
    const enableCaching = this.config.stagehandCacheActions !== false;
    const customInstructions = this.config.customTestInstructions || '';

    return `import { Page } from 'playwright';
import { Stagehand } from '@browserbasehq/stagehand';

/**
 * Stagehand-generated hybrid test for route: ${route.path}
 * Type: ${route.type}
 * Router: ${route.routerType || 'browser'}
 * LLM: ${llmProvider}
 */
export async function test(page: Page, baseUrl: string, screenshotPath: string, stepLogger: any) {
  try {
    // Initialize Stagehand with AI capabilities
    const stagehand = new Stagehand({
      page,
      llm: '${llmProvider}',
      enableCaching: ${enableCaching},
    });

    stepLogger.log('Navigating to page');
    const url = ${route.routerType === 'hash' ? `baseUrl + '/#' + '${route.path}'` : `baseUrl + '${route.path}'`};
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    stepLogger.log('Waiting for page to load');
    await page.waitForLoadState('domcontentloaded');

    stepLogger.log('AI analyzing page content');
    const pageContent = await stagehand.observe("What interactive elements are visible on this page?");

    ${customInstructions ? `stepLogger.log('Executing custom instructions');
    // Custom instructions: ${customInstructions}
    await stagehand.act("${customInstructions}");` : ''}

    // Let AI discover and interact with key elements
    stepLogger.log('AI discovering interactive elements');
    try {
      // Attempt to find and interact with common elements
      await stagehand.act("look for any buttons or interactive elements");
    } catch (error) {
      // Not all pages have interactive elements, continue
      stepLogger.log('No additional interactions needed');
    }

    stepLogger.log('Taking screenshot');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    stepLogger.log('Test complete');
    return screenshotPath;
  } catch (error) {
    throw new Error(\`Stagehand test failed for ${route.path}: \${(error as Error).message}\`);
  }
}
`;
  }

  private getTestName(routePath: string): string {
    // Handle root path specially
    if (routePath === '/') {
      return 'home';
    }

    // Strip leading slash and convert to filename
    return routePath
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase() || 'index';
  }
}
```

### 4. Update Test Generator (src/generator.ts)
```typescript
import { StagehandGenerator } from './stagehand-generator';

export class TestGenerator {
  private aiClient?: AIClient;
  private templateGenerator?: TemplateGenerator;
  private mcpGenerator?: MCPGenerator;
  private stagehandGenerator?: StagehandGenerator;  // NEW

  constructor(private config: Config) {
    const mode = config.testGenerationMode || 'ai';

    if (mode === 'template') {
      this.templateGenerator = new TemplateGenerator(config);
    } else if (mode === 'mcp') {
      this.mcpGenerator = new MCPGenerator(config);
    } else if (mode === 'stagehand') {  // NEW
      this.stagehandGenerator = new StagehandGenerator(config);
    } else {
      // AI mode
      switch (config.aiProvider) {
        // ... existing code
      }
    }
  }

  async generateTests(routes: RouteInfo[]): Promise<TestCase[]> {
    if (this.templateGenerator) {
      return await this.templateGenerator.generateTests(routes);
    }

    if (this.mcpGenerator) {
      return await this.mcpGenerator.generateTests(routes);
    }

    if (this.stagehandGenerator) {  // NEW
      return await this.stagehandGenerator.generateTests(routes);
    }

    // AI mode...
  }
}
```

### 5. Update Init Command (src/commands/init.ts)

#### Add to test generation mode choices:
```typescript
{
  type: 'list',
  name: 'testGenerationMode',
  message: 'How would you like to generate tests?',
  choices: [
    {
      name: 'AI-powered - Generate custom tests with intelligent interactions',
      value: 'ai',
    },
    {
      name: 'Template - Simple screenshot tests (no AI, faster)',
      value: 'template',
    },
    {
      name: 'MCP-Enhanced - AI + real-time validation (most reliable, slower)',
      value: 'mcp',
    },
    {
      name: 'Stagehand - Hybrid AI+Code tests (most intelligent)',  // NEW
      value: 'stagehand',
    },
  ],
  default: existingConfig?.testGenerationMode || 'ai',
}
```

#### Add Stagehand-specific prompts:
```typescript
{
  type: 'list',
  name: 'stagehandLLM',
  message: 'Which LLM provider for Stagehand?',
  choices: [
    {
      name: 'Anthropic (Claude) - Recommended for best results',
      value: 'anthropic',
    },
    {
      name: 'OpenAI (GPT-4) - Fast and reliable',
      value: 'openai',
    },
  ],
  when: (answers) => answers.testGenerationMode === 'stagehand',
  default: existingConfig?.stagehandLLM || 'anthropic',
},
{
  type: 'password',
  name: 'stagehandApiKey',
  message: 'API key for Stagehand (or press Enter to use environment variable):',
  when: (answers) => answers.testGenerationMode === 'stagehand',
  default: existingConfig?.stagehandApiKey || '',
},
{
  type: 'confirm',
  name: 'stagehandCacheActions',
  message: 'Enable Stagehand action caching? (Reduces token usage)',
  when: (answers) => answers.testGenerationMode === 'stagehand',
  default: existingConfig?.stagehandCacheActions !== false,
}
```

#### Add dependency check:
```typescript
if (existingConfig?.testGenerationMode === 'stagehand') {
  Logger.checking('Stagehand');
  const stagehandInstalled = await checkDependencyStatus(
    'stagehand',
    'npm list @browserbasehq/stagehand'
  );
  if (stagehandInstalled) {
    Logger.installed('Stagehand');
  } else {
    Logger.notInstalled('Stagehand');
    Logger.dim('  Run: npm install @browserbasehq/stagehand');
  }
}
```

#### Add API verification:
```typescript
// In verifyAISetup()
if (config.testGenerationMode === 'stagehand') {
  // Check if API key is configured
  const apiKey = config.stagehandApiKey || process.env[
    config.stagehandLLM === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
  ];

  if (!apiKey) {
    Logger.error(`${config.stagehandLLM} API key not configured`);
    Logger.info(`Set ${config.stagehandLLM === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} environment variable`);
    return false;
  }

  Logger.success('Stagehand configuration ready');
}
```

### 6. Update Configuration Manager (src/config.ts)
```typescript
public static getDefaultConfig(): Partial<Config> {
  return {
    outputDir: 'lastest-results',
    viewport: {
      width: 1920,
      height: 1080,
    },
    diffThreshold: 1,
    parallel: true,
    maxConcurrency: 3,
    testGenerationMode: 'ai',
    stagehandLLM: 'anthropic',           // NEW
    stagehandCacheActions: true,         // NEW
  };
}
```

### 7. Update Documentation (CLAUDE.md)

Add comprehensive Stagehand Mode section:

```markdown
**Stagehand Mode (NEW):**
- Uses `StagehandGenerator` class (hybrid AI + code)
- Combines Playwright code with AI-powered actions
- Workflow:
  1. Initialize Stagehand with configured LLM (OpenAI or Anthropic)
  2. Navigate to route using standard Playwright
  3. AI observes page content and discovers interactions
  4. AI performs intelligent interactions based on page analysis
  5. Execute custom instructions via AI actions
  6. Take screenshot for comparison
  7. Save as re-runnable TypeScript test file
- Benefits:
  - **Highest intelligence** - AI understands page context
  - **Hybrid reliability** - Mix explicit code with AI when needed
  - **Token efficient** - Cache AI actions to reduce costs
  - **Production-ready** - Designed for real-world use cases
  - **Flexible** - Use AI only where it adds value
- Trade-offs:
  - Requires LLM API key (OpenAI or Anthropic)
  - API costs for LLM calls (reduced with caching)
  - Medium speed (faster than MCP, slower than template)
- Requirements:
  - `npm install @browserbasehq/stagehand`
  - API key: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variable
  - Or configure API key in `.lastestrc.json`
- Enabled via `testGenerationMode: 'stagehand'` in config

## Mode Comparison (Updated)

| Feature | AI Mode | Template | MCP | **Stagehand** |
|---------|---------|----------|-----|---------------|
| Speed | Fast | Fastest | Slow | Medium |
| Cost | AI tokens | Free | AI tokens (2x) | **LLM API calls** |
| Selector validation | No | N/A | Yes | **Yes (AI-driven)** |
| Interaction discovery | No | No | Yes | **Yes (automatic)** |
| Reliability | Medium | Low | High | **Very High** |
| Re-runnable tests | Yes | Yes | Yes | **Yes** |
| API key required | No | No | No | **Yes** |
| Intelligence | Medium | None | High | **Highest** |
| Token efficiency | N/A | N/A | Low | **High (caching)** |
| Production-ready | Medium | Low | High | **Very High** |
```

## Generated Test Example

Example of a Stagehand-generated test:

```typescript
import { Page } from 'playwright';
import { Stagehand } from '@browserbasehq/stagehand';

/**
 * Stagehand-generated hybrid test for route: /contact
 * Type: static
 * Router: browser
 * LLM: anthropic
 */
export async function test(page: Page, baseUrl: string, screenshotPath: string, stepLogger: any) {
  try {
    // Initialize Stagehand with AI capabilities
    const stagehand = new Stagehand({
      page,
      llm: 'anthropic',
      enableCaching: true,
    });

    stepLogger.log('Navigating to page');
    const url = baseUrl + '/contact';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    stepLogger.log('Waiting for page to load');
    await page.waitForLoadState('domcontentloaded');

    stepLogger.log('AI analyzing page content');
    const pageContent = await stagehand.observe("What interactive elements are visible on this page?");

    stepLogger.log('Executing custom instructions');
    // Custom instructions: Fill contact form and submit
    await stagehand.act("Fill contact form and submit");

    // Let AI discover and interact with key elements
    stepLogger.log('AI discovering interactive elements');
    try {
      // Attempt to find and interact with common elements
      await stagehand.act("look for any buttons or interactive elements");
    } catch (error) {
      // Not all pages have interactive elements, continue
      stepLogger.log('No additional interactions needed');
    }

    stepLogger.log('Taking screenshot');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    stepLogger.log('Test complete');
    return screenshotPath;
  } catch (error) {
    throw new Error(`Stagehand test failed for /contact: ${(error as Error).message}`);
  }
}
```

## Files to Create
1. `src/stagehand-generator.ts` - Main generator implementation

## Files to Modify
1. `src/types.ts` - Add 'stagehand' mode and config options
2. `src/generator.ts` - Add Stagehand generator routing
3. `src/commands/init.ts` - Add prompts and dependency checks
4. `src/config.ts` - Add default config values
5. `package.json` - Add Stagehand dependency
6. `CLAUDE.md` - Add comprehensive documentation

## Testing Strategy

After implementation:

1. **Install Stagehand**:
   ```bash
   npm install @browserbasehq/stagehand
   ```

2. **Configure API Key**:
   ```bash
   # For Anthropic/Claude
   export ANTHROPIC_API_KEY=your_key_here

   # For OpenAI
   export OPENAI_API_KEY=your_key_here
   ```

3. **Run Init**:
   ```bash
   lastest init
   # Select "Stagehand - Hybrid AI+Code tests (most intelligent)"
   # Choose LLM provider (Anthropic or OpenAI)
   # Enable action caching (recommended)
   ```

4. **Verify**:
   - Check generated tests use Stagehand import
   - Verify tests use hybrid approach (Playwright + AI actions)
   - Confirm tests are re-runnable with `lastest` command
   - Validate action caching reduces token usage on re-runs

5. **Compare Results**:
   - Run same routes with AI, MCP, and Stagehand modes
   - Compare test quality, reliability, and interaction coverage
   - Measure token usage and cost differences
   - Evaluate fallback rate reduction

## Use Cases

### When to Use Stagehand Mode

1. **Complex Interactive Pages**:
   - Forms with dynamic validation
   - Multi-step workflows
   - Pages with conditional UI elements

2. **Production Testing**:
   - Critical user flows
   - E-commerce checkout processes
   - User authentication flows

3. **Token Efficiency**:
   - Repeated test runs (action caching saves tokens)
   - Large test suites
   - CI/CD integration

4. **Intelligent Discovery**:
   - Pages with dynamic content
   - SPAs with client-side routing
   - Pages where selector reliability is critical

### When NOT to Use Stagehand Mode

1. **Simple Static Pages**: Use Template mode
2. **Budget Constraints**: Use Template or AI mode (no API costs)
3. **Maximum Speed**: Use Template mode
4. **No API Key Available**: Use AI, Template, or MCP mode

## Future Enhancements

1. **Smart Mode Selection**:
   - Analyze route complexity
   - Auto-select best mode per route
   - Mix modes in single test suite

2. **Action Library**:
   - Build reusable action cache
   - Share common interactions across tests
   - Reduce token usage further

3. **Advanced Stagehand Features**:
   - Use `extract()` for data validation
   - Use `agent()` for multi-step flows
   - Implement custom action schemas

4. **Cost Optimization**:
   - Track token usage per test
   - Compare costs across modes
   - Recommend most cost-effective approach

## Migration Path

For existing lasTest users:

1. **No Breaking Changes**: Existing modes (ai, template, mcp) continue to work
2. **Opt-in**: Stagehand is a new option, not a replacement
3. **Gradual Adoption**: Try Stagehand on critical routes first
4. **Fallback**: Can always revert to other modes if needed

## References

- Stagehand GitHub: https://github.com/browserbase/stagehand
- Stagehand NPM: https://www.npmjs.com/package/@browserbasehq/stagehand
- Stagehand Docs: (check package documentation)
- OpenAI API: https://platform.openai.com/docs
- Anthropic API: https://docs.anthropic.com/

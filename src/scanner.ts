import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { RouteInfo, Config } from './types';
import { Logger } from './utils/logger';

export class Scanner {
  constructor(
    private scanPath: string,
    private config?: Config
  ) {}

  async scan(): Promise<RouteInfo[]> {
    // Check if AI route detection is enabled
    if (this.config?.useAIRouteDetection) {
      Logger.dim('Using AI-powered route detection...');
      return await this.aiDetectRoutes();
    }

    const routes: RouteInfo[] = [];

    // Detect project type and scan accordingly
    const projectType = await this.detectProjectType();

    switch (projectType) {
      case 'nextjs-app':
        routes.push(...(await this.scanNextJsApp()));
        break;
      case 'nextjs-pages':
        routes.push(...(await this.scanNextJsPages()));
        break;
      case 'react-router':
        routes.push(...(await this.scanReactRouter()));
        break;
      case 'vue':
        routes.push(...(await this.scanVueRouter()));
        break;
      default:
        Logger.warn('Unable to detect framework, scanning for common patterns...');
        routes.push(...(await this.scanGeneric()));
    }

    return routes;
  }

  private async detectProjectType(): Promise<string> {
    // Look for package.json in scan path and parent directories
    let searchPath = path.resolve(this.scanPath);
    let packageJsonPath = path.join(searchPath, 'package.json');

    // Search up to 3 levels
    for (let i = 0; i < 3; i++) {
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (deps.next) {
          // Check if app dir exists relative to package.json location
          const projectRoot = path.dirname(packageJsonPath);
          if (await fs.pathExists(path.join(projectRoot, 'app'))) {
            return 'nextjs-app';
          }
          return 'nextjs-pages';
        }

        if (deps['react-router'] || deps['react-router-dom']) {
          return 'react-router';
        }

        if (deps.vue && deps['vue-router']) {
          return 'vue';
        }

        break;
      }

      searchPath = path.dirname(searchPath);
      packageJsonPath = path.join(searchPath, 'package.json');
    }

    return 'unknown';
  }

  private async getProjectRoot(): Promise<string> {
    // Find project root by looking for package.json
    let searchPath = path.resolve(this.scanPath);

    for (let i = 0; i < 3; i++) {
      const packageJsonPath = path.join(searchPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        return searchPath;
      }
      searchPath = path.dirname(searchPath);
    }

    return path.resolve(this.scanPath);
  }

  private async scanNextJsApp(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const projectRoot = await this.getProjectRoot();
    const appDir = path.join(projectRoot, 'app');

    // If scanPath is more specific (e.g., ./app), use that
    const scanDir = this.scanPath.includes('app')
      ? path.resolve(this.scanPath)
      : appDir;

    if (!(await fs.pathExists(scanDir))) {
      return routes;
    }

    const pageFiles = await glob('**/page.{js,jsx,ts,tsx}', {
      cwd: scanDir,
      absolute: true,
    });

    for (const file of pageFiles) {
      const relativePath = path.relative(scanDir, path.dirname(file));
      const route = '/' + relativePath.replace(/\\/g, '/');

      routes.push({
        path: route === '/' ? '/' : route,
        type: route.includes('[') ? 'dynamic' : 'static',
        filePath: file,
        component: path.basename(file),
      });
    }

    return routes;
  }

  private async scanNextJsPages(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const projectRoot = await this.getProjectRoot();
    const pagesDir = path.join(projectRoot, 'pages');

    if (!(await fs.pathExists(pagesDir))) {
      return routes;
    }

    const pageFiles = await glob('**/*.{js,jsx,ts,tsx}', {
      cwd: pagesDir,
      absolute: true,
      ignore: ['**/_*.{js,jsx,ts,tsx}', '**/api/**'],
    });

    for (const file of pageFiles) {
      const relativePath = path.relative(pagesDir, file);
      let route = '/' + relativePath.replace(/\\/g, '/').replace(/\.(js|jsx|ts|tsx)$/, '');

      // Handle index files
      if (route.endsWith('/index')) {
        route = route.replace('/index', '') || '/';
      }

      routes.push({
        path: route,
        type: route.includes('[') ? 'dynamic' : 'static',
        filePath: file,
        component: path.basename(file),
      });
    }

    return routes;
  }

  private async scanReactRouter(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const projectRoot = await this.getProjectRoot();

    // Look for route definitions in common locations
    const routeFiles = await glob('**/{routes,router,App}.{js,jsx,ts,tsx}', {
      cwd: path.join(projectRoot, 'src'),
      absolute: true,
      ignore: ['**/node_modules/**'],
    });

    for (const file of routeFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Detect router type
      const routerType = this.detectReactRouterType(content);

      // Simple regex to find route paths (this is basic, could be improved)
      const routeMatches = content.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g);

      for (const match of routeMatches) {
        routes.push({
          path: match[1],
          type: match[1].includes(':') ? 'dynamic' : 'static',
          filePath: file,
          routerType,
        });
      }
    }

    return routes;
  }

  private detectReactRouterType(content: string): 'hash' | 'browser' | undefined {
    // Check for HashRouter patterns
    const hasHashRouter =
      content.includes('createHashRouter') ||
      content.includes('<HashRouter') ||
      content.includes('HashRouter>');

    // Check for BrowserRouter patterns
    const hasBrowserRouter =
      content.includes('createBrowserRouter') ||
      content.includes('<BrowserRouter') ||
      content.includes('BrowserRouter>');

    if (hasHashRouter) {
      return 'hash';
    } else if (hasBrowserRouter) {
      return 'browser';
    }

    // Default to undefined if we can't detect
    return undefined;
  }

  private async scanVueRouter(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const projectRoot = await this.getProjectRoot();

    // Look for router configuration
    const routerFiles = await glob('**/router/*.{js,ts}', {
      cwd: path.join(projectRoot, 'src'),
      absolute: true,
    });

    for (const file of routerFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Simple regex to find route paths
      const routeMatches = content.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g);

      for (const match of routeMatches) {
        routes.push({
          path: match[1],
          type: match[1].includes(':') ? 'dynamic' : 'static',
          filePath: file,
        });
      }
    }

    return routes;
  }

  private async scanGeneric(): Promise<RouteInfo[]> {
    // Fallback: just return the root path
    return [
      {
        path: '/',
        type: 'static',
      },
    ];
  }

  private async aiDetectRoutes(): Promise<RouteInfo[]> {
    if (!this.config) {
      throw new Error('Config is required for AI route detection');
    }

    try {
      // Import AI client dynamically based on config
      const { query } = await import('@anthropic-ai/claude-agent-sdk');

      // Get relevant files for context
      const projectRoot = await this.getProjectRoot();
      const relevantFiles = await this.getRelevantFiles(projectRoot);

      // Build context from files
      const filesContext = await this.buildFilesContext(relevantFiles);

      const prompt = `Analyze the following codebase files and extract ALL route definitions.

Return a JSON array of route objects with this exact format:
[
  {
    "path": "/route-path",
    "type": "static",
    "filePath": "optional-file-path",
    "routerType": "hash"
  }
]

Field specifications:
- "path": string - The route path (e.g., "/", "/about", "/users/:id")
- "type": Must be exactly "static" OR "dynamic" (dynamic if path contains parameters like :id, [id], etc.)
- "filePath": string (optional) - Relative file path if known
- "routerType": string (optional) - Must be exactly "hash" OR "browser" if detected. OMIT this field entirely if unknown.

Files to analyze:
${filesContext}

IMPORTANT:
- Look for Next.js page files, React Router routes, Vue Router routes, etc.
- Identify static routes (exact paths) vs dynamic routes (with parameters)
- Detect if HashRouter or BrowserRouter is used
- Return ONLY valid JSON array, no explanations or markdown
- Skip API routes or server-only routes
- For unknown routerType, DO NOT include the field at all (do not use null or undefined)`;

      let responseText = '';

      for await (const message of query({ prompt })) {
        if (message.type === 'assistant') {
          const content = message.message.content;
          for (const block of content) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
        }
      }

      // Extract JSON from response (try multiple strategies)
      let jsonString: string | null = null;

      // Strategy 1: Look for JSON in markdown code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      }

      // Strategy 2: Look for raw JSON array
      if (!jsonString) {
        const rawJsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (rawJsonMatch) {
          jsonString = rawJsonMatch[0];
        }
      }

      if (!jsonString) {
        Logger.warn('AI did not return valid JSON, falling back to traditional scanning');
        return await this.scanTraditional();
      }

      // Parse and validate JSON
      try {
        const parsed = JSON.parse(jsonString);

        if (!Array.isArray(parsed)) {
          throw new Error('Response is not an array');
        }

        // Validate and filter routes
        const routes: RouteInfo[] = this.validateRoutes(parsed);

        if (routes.length === 0) {
          Logger.warn('No valid routes found in AI response, falling back to traditional scanning');
          return await this.scanTraditional();
        }

        return routes;
      } catch (error) {
        Logger.error(`Failed to parse AI response: ${(error as Error).message}`);
        Logger.warn('Falling back to traditional route scanning...');
        return await this.scanTraditional();
      }
    } catch (error) {
      Logger.error(`AI route detection failed: ${(error as Error).message}`);
      Logger.warn('Falling back to traditional route scanning...');
      return await this.scanTraditional();
    }
  }

  private async scanTraditional(): Promise<RouteInfo[]> {
    // Run traditional scanning logic
    const routes: RouteInfo[] = [];
    const projectType = await this.detectProjectType();

    switch (projectType) {
      case 'nextjs-app':
        routes.push(...(await this.scanNextJsApp()));
        break;
      case 'nextjs-pages':
        routes.push(...(await this.scanNextJsPages()));
        break;
      case 'react-router':
        routes.push(...(await this.scanReactRouter()));
        break;
      case 'vue':
        routes.push(...(await this.scanVueRouter()));
        break;
      default:
        routes.push(...(await this.scanGeneric()));
    }

    return routes;
  }

  private async getRelevantFiles(projectRoot: string): Promise<string[]> {
    // Find files that likely contain route definitions
    const patterns = [
      '**/routes/**/*.{js,jsx,ts,tsx}',
      '**/router/**/*.{js,jsx,ts,tsx}',
      '**/pages/**/*.{js,jsx,ts,tsx}',
      '**/app/**/page.{js,jsx,ts,tsx}',
      '**/App.{js,jsx,ts,tsx}',
    ];

    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      });
      files.push(...matches);
    }

    // Deduplicate
    return [...new Set(files)]; // No limit - rely on AI provider's token limits
  }

  private async buildFilesContext(files: string[]): Promise<string> {
    const contexts: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        contexts.push(`
File: ${relativePath}
\`\`\`
${content.slice(0, 2000)} // Limit each file to 2000 chars
\`\`\`
`);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return contexts.join('\n---\n');
  }

  private validateRoutes(parsed: unknown[]): RouteInfo[] {
    const validRoutes: RouteInfo[] = [];

    for (const item of parsed) {
      // Type guard to ensure item is an object
      if (typeof item !== 'object' || item === null) {
        Logger.warn('Skipping invalid route: not an object');
        continue;
      }

      const routeItem = item as Record<string, unknown>;

      // Validate required fields
      if (!routeItem.path || typeof routeItem.path !== 'string') {
        Logger.warn(`Skipping invalid route: missing or invalid 'path' field`);
        continue;
      }

      if (!routeItem.type || (routeItem.type !== 'static' && routeItem.type !== 'dynamic')) {
        Logger.warn(`Skipping route ${routeItem.path}: invalid 'type' field (must be 'static' or 'dynamic')`);
        continue;
      }

      // Validate optional fields
      const route: RouteInfo = {
        path: routeItem.path,
        type: routeItem.type as 'static' | 'dynamic',
      };

      if (routeItem.filePath && typeof routeItem.filePath === 'string') {
        route.filePath = routeItem.filePath;
      }

      if (routeItem.component && typeof routeItem.component === 'string') {
        route.component = routeItem.component;
      }

      if (routeItem.routerType) {
        if (routeItem.routerType === 'hash' || routeItem.routerType === 'browser') {
          route.routerType = routeItem.routerType as 'hash' | 'browser';
        } else {
          Logger.warn(`Route ${routeItem.path}: invalid routerType '${routeItem.routerType}', omitting field`);
        }
      }

      validRoutes.push(route);
    }

    return validRoutes;
  }
}

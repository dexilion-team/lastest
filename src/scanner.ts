import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { RouteInfo } from './types';
import { Logger } from './utils/logger';

export class Scanner {
  constructor(private scanPath: string) {}

  async scan(): Promise<RouteInfo[]> {
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

      // Simple regex to find route paths (this is basic, could be improved)
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
}

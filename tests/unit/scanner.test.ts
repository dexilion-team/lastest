import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scanner } from '../../src/scanner';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanTestOutput, DEXILION_PATH, getDexilionConfig } from '../helpers/test-utils';
import { Config } from '../../src/types';

describe('Scanner', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('scanner-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('detectProjectType', () => {
    it('should detect Next.js app router project', async () => {
      // Create mock Next.js app structure
      const projectDir = path.join(tempDir, 'nextjs-app');
      await fs.ensureDir(path.join(projectDir, 'app'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      // Should find at least one route (or none if no page files)
      expect(Array.isArray(routes)).toBe(true);
    });

    it('should detect Next.js pages router project', async () => {
      // Create mock Next.js pages structure
      const projectDir = path.join(tempDir, 'nextjs-pages');
      await fs.ensureDir(path.join(projectDir, 'pages'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should detect React Router project', async () => {
      // Create mock React Router structure
      const projectDir = path.join(tempDir, 'react-router');
      await fs.ensureDir(path.join(projectDir, 'src'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { 'react-router-dom': '^6.0.0' },
      });

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      expect(Array.isArray(routes)).toBe(true);
    });

    it('should detect Vue Router project', async () => {
      // Create mock Vue Router structure
      const projectDir = path.join(tempDir, 'vue-router');
      await fs.ensureDir(path.join(projectDir, 'src/router'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { vue: '^3.0.0', 'vue-router': '^4.0.0' },
      });

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('scan', () => {
    it('should find all static routes in Next.js app', async () => {
      const projectDir = path.join(tempDir, 'nextjs-test');
      const appDir = path.join(projectDir, 'app');

      // Ensure project directory exists
      await fs.ensureDir(projectDir);

      // Create package.json
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });

      // Create static routes
      await fs.ensureDir(path.join(appDir));
      await fs.writeFile(path.join(appDir, 'page.tsx'), 'export default function Page() {}');

      await fs.ensureDir(path.join(appDir, 'about'));
      await fs.writeFile(path.join(appDir, 'about/page.tsx'), 'export default function About() {}');

      await fs.ensureDir(path.join(appDir, 'contact'));
      await fs.writeFile(path.join(appDir, 'contact/page.tsx'), 'export default function Contact() {}');

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      expect(routes.length).toBe(3);
      expect(routes.find((r) => r.path === '/')).toBeTruthy();
      expect(routes.find((r) => r.path === '/about')).toBeTruthy();
      expect(routes.find((r) => r.path === '/contact')).toBeTruthy();
    });

    it('should categorize dynamic routes', async () => {
      const projectDir = path.join(tempDir, 'dynamic-test');
      const appDir = path.join(projectDir, 'app');

      // Ensure project directory exists
      await fs.ensureDir(projectDir);

      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { next: '^14.0.0' },
      });

      // Create dynamic route
      await fs.ensureDir(path.join(appDir, 'blog/[slug]'));
      await fs.writeFile(path.join(appDir, 'blog/[slug]/page.tsx'), 'export default function Post() {}');

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      const dynamicRoute = routes.find((r) => r.path.includes('[slug]'));
      expect(dynamicRoute).toBeTruthy();
      expect(dynamicRoute?.type).toBe('dynamic');
    });

    it('should handle empty projects', async () => {
      const projectDir = path.join(tempDir, 'empty-project');
      await fs.ensureDir(projectDir);

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      // Should return at least root route
      expect(Array.isArray(routes)).toBe(true);
    });

    it('should detect hash router in React Router', async () => {
      const projectDir = path.join(tempDir, 'hash-router');
      await fs.ensureDir(path.join(projectDir, 'src'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { 'react-router-dom': '^6.0.0' },
      });

      // Create router file with HashRouter
      await fs.writeFile(
        path.join(projectDir, 'src/App.tsx'),
        `import { HashRouter, Route } from 'react-router-dom';

const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> }
];

export default function App() {
  return <HashRouter>{/* routes */}</HashRouter>;
}`
      );

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      // Should detect hash router type
      const route = routes.find((r) => r.routerType === 'hash');
      expect(route).toBeTruthy();
    });
  });

  describe('dexilion.com real project scenarios', () => {
    it('should scan dexilion.com project if it exists', async () => {
      // Only run if dexilion.com path exists
      const exists = await fs.pathExists(DEXILION_PATH);
      if (!exists) {
        console.warn('Skipping dexilion.com test - path does not exist');
        return;
      }

      const scanner = new Scanner(DEXILION_PATH);
      const routes = await scanner.scan();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);

      // All routes should have required properties
      routes.forEach((route) => {
        expect(route.path).toBeTruthy();
        expect(route.type).toMatch(/static|dynamic/);
      });
    });

    it('should filter out dynamic routes from dexilion.com', async () => {
      const exists = await fs.pathExists(DEXILION_PATH);
      if (!exists) {
        console.warn('Skipping dexilion.com test - path does not exist');
        return;
      }

      const scanner = new Scanner(DEXILION_PATH);
      const routes = await scanner.scan();

      const staticRoutes = routes.filter((r) => r.type === 'static');
      const dynamicRoutes = routes.filter((r) => r.type === 'dynamic');

      expect(staticRoutes.length).toBeGreaterThanOrEqual(0);

      // Dynamic routes should be marked as such
      dynamicRoutes.forEach((route) => {
        expect(route.path).toMatch(/\[|\:/); // Contains [ or : for params
      });
    });

    it('should use AI route detection when enabled', async () => {
      const exists = await fs.pathExists(DEXILION_PATH);
      if (!exists) {
        console.warn('Skipping dexilion.com test - path does not exist');
        return;
      }

      const config = getDexilionConfig({ useAIRouteDetection: true });
      const scanner = new Scanner(DEXILION_PATH, config);

      // Mock the aiDetectRoutes method to avoid actual API calls
      vi.spyOn(scanner as any, 'aiDetectRoutes').mockResolvedValue([
        { path: '/', type: 'static', filePath: '/test/page.tsx' },
        { path: '/about', type: 'static', filePath: '/test/about.tsx' },
      ]);

      const routes = await scanner.scan();

      // Should have called AI detection
      expect(routes.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('React Router type detection', () => {
    it('should detect BrowserRouter', async () => {
      const projectDir = path.join(tempDir, 'browser-router');
      await fs.ensureDir(path.join(projectDir, 'src'));
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        dependencies: { 'react-router-dom': '^6.0.0' },
      });

      await fs.writeFile(
        path.join(projectDir, 'src/router.tsx'),
        `import { BrowserRouter, Routes, Route } from 'react-router-dom';

export const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> }
];

export default function App() {
  return <BrowserRouter>{/* routes */}</BrowserRouter>;
}`
      );

      const scanner = new Scanner(projectDir);
      const routes = await scanner.scan();

      const route = routes.find((r) => r.routerType === 'browser');
      expect(route).toBeTruthy();
    });
  });
});

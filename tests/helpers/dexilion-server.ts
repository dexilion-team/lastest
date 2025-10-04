import { exec, ChildProcess } from 'child_process';
import { waitFor } from './test-utils';

/**
 * Helper to start and stop the dexilion.com dev server for E2E tests
 */

export class DexilionServer {
  private process: ChildProcess | null = null;
  private port: number = 3000;
  private projectPath: string;

  constructor(projectPath: string = '/home/wyctor/dexilion.com', port: number = 3000) {
    this.projectPath = projectPath;
    this.port = port;
  }

  /**
   * Start the dev server
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      // Start the dev server (Next.js uses --port flag)
      this.process = exec(`npm run dev -- --port ${this.port}`, {
        cwd: this.projectPath,
      });

      if (!this.process) {
        reject(new Error('Failed to start server process'));
        return;
      }

      // Listen for output
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log('[Dev Server]', output);

        // Check if server is ready (common patterns)
        if (
          output.includes('ready') ||
          output.includes('compiled') ||
          output.includes(`localhost:${this.port}`)
        ) {
          // Wait a bit more to ensure server is fully ready
          setTimeout(() => resolve(), 2000);
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('[Dev Server Error]', data.toString());
      });

      this.process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Server start timeout after 60 seconds'));
      }, 60000);
    });
  }

  /**
   * Stop the dev server
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.process = null;
        resolve();
      });

      // Kill the process
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
          this.process = null;
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * Check if server is responsive
   */
  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}`);
      return response.status < 500;
    } catch {
      return false;
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForReady(timeout: number = 30000): Promise<void> {
    await waitFor(() => this.isReady(), timeout, 1000);
  }

  /**
   * Get the server URL
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}

/**
 * Helper function to create and manage server for tests
 */
export async function withDexilionServer<T>(
  callback: (serverUrl: string) => Promise<T>
): Promise<T> {
  const server = new DexilionServer();

  try {
    await server.start();
    await server.waitForReady();
    return await callback(server.getUrl());
  } finally {
    await server.stop();
  }
}

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * MCP Helper Utilities
 * Functions for checking and managing Playwright MCP server installation
 */

/**
 * Check if Playwright MCP server is installed
 */
export async function checkMCPInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('claude mcp list', { timeout: 5000 });
    return stdout.includes('playwright') || stdout.includes('@playwright/mcp');
  } catch (error) {
    return false;
  }
}

/**
 * Check if MCP is available (Claude CLI installed)
 */
export async function checkMCPAvailable(): Promise<boolean> {
  try {
    await execAsync('claude --version', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get installation instructions for Playwright MCP
 */
export function getMCPInstallInstructions(): string {
  return 'Run: claude mcp add @playwright/mcp@latest';
}

/**
 * Check if all MCP dependencies are ready
 */
export async function checkMCPReady(): Promise<{
  available: boolean;
  installed: boolean;
  ready: boolean;
}> {
  const available = await checkMCPAvailable();
  const installed = available ? await checkMCPInstalled() : false;

  return {
    available,
    installed,
    ready: available && installed,
  };
}

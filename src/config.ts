import * as fs from 'fs-extra';
import * as path from 'path';
import { Config } from './types';

const CONFIG_FILE = '.lastestrc.json';

export class ConfigManager {
  static async load(cwd: string = process.cwd()): Promise<Config | null> {
    const configPath = path.join(cwd, CONFIG_FILE);

    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      let config = JSON.parse(content);
      config = this.migrateViewportConfig(config);
      return config;
    }

    return null;
  }

  static async save(config: Config, cwd: string = process.cwd()): Promise<void> {
    const configPath = path.join(cwd, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  static getDefaultConfig(): Partial<Config> {
    return {
      scanPath: '.',
      outputDir: 'lastest-results',
      viewport: {
        width: 1920,
        height: 1080,
      },
      viewports: [
        { name: 'Desktop', slug: 'desktop', width: 1920, height: 1080 },
        { name: 'Mobile (iPhone SE)', slug: 'mobile', width: 375, height: 667 }
      ],
      diffThreshold: 1,
      parallel: true,
      maxConcurrency: 5,
      screenshotHotkey: 'Control+Shift+KeyS',
    };
  }

  private static migrateViewportConfig(config: any): Config {
    // Migrate old single viewport to viewports array
    if (config.viewport && !config.viewports) {
      config.viewports = [{
        name: 'Desktop',
        slug: 'desktop',
        width: config.viewport.width,
        height: config.viewport.height
      }];
      delete config.viewport;
    }

    // Ensure viewports array is not empty
    if (!config.viewports || config.viewports.length === 0) {
      config.viewports = this.getDefaultConfig().viewports;
    }

    return config;
  }
}

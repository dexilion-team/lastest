import * as fs from 'fs-extra';
import * as path from 'path';
import { Config } from './types';

const CONFIG_FILE = '.lastestrc.json';

export class ConfigManager {
  static async load(cwd: string = process.cwd()): Promise<Config | null> {
    const configPath = path.join(cwd, CONFIG_FILE);

    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
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
      diffThreshold: 1,
      parallel: true,
      maxConcurrency: 5,
    };
  }
}

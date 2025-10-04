import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../../src/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanTestOutput, getDexilionConfig } from '../helpers/test-utils';
import { Config } from '../../src/types';

describe('ConfigManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    await cleanTestOutput();
    tempDir = await createTempDir('config-test');
  });

  afterEach(async () => {
    await cleanTestOutput();
  });

  describe('save', () => {
    it('should save config to .lastestrc.json', async () => {
      const config = getDexilionConfig();
      await ConfigManager.save(config, tempDir);

      const configPath = path.join(tempDir, '.lastestrc.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const saved = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(saved.liveUrl).toBe('https://dexilion.com/');
      expect(saved.devUrl).toBe('http://localhost:3000');
      expect(saved.scanPath).toBe('/home/wyctor/dexilion.com');
    });

    it('should format config as valid JSON', async () => {
      const config = getDexilionConfig();
      await ConfigManager.save(config, tempDir);

      const configPath = path.join(tempDir, '.lastestrc.json');
      const content = await fs.readFile(configPath, 'utf-8');

      // Should not throw
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should overwrite existing config', async () => {
      const config1 = getDexilionConfig({ liveUrl: 'https://first.com' });
      await ConfigManager.save(config1, tempDir);

      const config2 = getDexilionConfig({ liveUrl: 'https://second.com' });
      await ConfigManager.save(config2, tempDir);

      const loaded = await ConfigManager.load(tempDir);
      expect(loaded?.liveUrl).toBe('https://second.com');
    });
  });

  describe('load', () => {
    it('should load existing config', async () => {
      const config = getDexilionConfig();
      await ConfigManager.save(config, tempDir);

      const loaded = await ConfigManager.load(tempDir);
      expect(loaded).toBeTruthy();
      expect(loaded?.liveUrl).toBe('https://dexilion.com/');
      expect(loaded?.devUrl).toBe('http://localhost:3000');
      expect(loaded?.aiProvider).toBe('claude-subscription');
    });

    it('should return null when config does not exist', async () => {
      const loaded = await ConfigManager.load(tempDir);
      expect(loaded).toBeNull();
    });

    it('should load all config properties correctly', async () => {
      const config: Config = {
        aiProvider: 'claude-subscription',
        liveUrl: 'https://dexilion.com/',
        devUrl: 'http://localhost:3000',
        scanPath: '/home/wyctor/dexilion.com',
        outputDir: 'lastest-results',
        viewport: { width: 1280, height: 720 },
        diffThreshold: 0.2,
        parallel: false,
        maxConcurrency: 3,
        useAIRouteDetection: true,
        customTestInstructions: 'Click all buttons',
        testGenerationMode: 'template',
      };

      await ConfigManager.save(config, tempDir);
      const loaded = await ConfigManager.load(tempDir);

      expect(loaded).toEqual(config);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default config values', () => {
      const defaults = ConfigManager.getDefaultConfig();

      expect(defaults.scanPath).toBe('.');
      expect(defaults.outputDir).toBe('lastest-results');
      expect(defaults.viewport).toEqual({ width: 1920, height: 1080 });
      expect(defaults.diffThreshold).toBe(0.1);
      expect(defaults.parallel).toBe(true);
      expect(defaults.maxConcurrency).toBe(5);
    });

    it('should not include required fields in defaults', () => {
      const defaults = ConfigManager.getDefaultConfig();

      expect(defaults).not.toHaveProperty('aiProvider');
      expect(defaults).not.toHaveProperty('liveUrl');
      expect(defaults).not.toHaveProperty('devUrl');
    });
  });

  describe('dexilion.com specific scenarios', () => {
    it('should handle dexilion.com path configuration', async () => {
      const config = getDexilionConfig({
        scanPath: '/home/wyctor/dexilion.com',
      });

      await ConfigManager.save(config, tempDir);
      const loaded = await ConfigManager.load(tempDir);

      expect(loaded?.scanPath).toBe('/home/wyctor/dexilion.com');
    });

    it('should handle both test generation modes', async () => {
      // AI mode
      const aiConfig = getDexilionConfig({ testGenerationMode: 'ai' });
      await ConfigManager.save(aiConfig, tempDir);
      let loaded = await ConfigManager.load(tempDir);
      expect(loaded?.testGenerationMode).toBe('ai');

      // Template mode
      const templateConfig = getDexilionConfig({ testGenerationMode: 'template' });
      await ConfigManager.save(templateConfig, tempDir);
      loaded = await ConfigManager.load(tempDir);
      expect(loaded?.testGenerationMode).toBe('template');
    });

    it('should preserve custom test instructions', async () => {
      const instructions = 'Click newsletter button, fill email with test@example.com, submit form';
      const config = getDexilionConfig({ customTestInstructions: instructions });

      await ConfigManager.save(config, tempDir);
      const loaded = await ConfigManager.load(tempDir);

      expect(loaded?.customTestInstructions).toBe(instructions);
    });
  });
});

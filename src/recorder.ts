/**
 * Test Recorder for lasTest
 * Launches headed browser and captures user interactions as Playwright tests
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { InteractionTracker, RecordedInteraction } from './utils/interaction-tracker';
import { getInjectedSelectorScript } from './utils/selector-generator';
import { Logger } from './utils/logger';
import { TestCase } from './types';

export interface RecordingConfig {
  startUrl: string;
  screenshotHotkey: string;
  outputDir: string;
}

export class TestRecorder {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private context: BrowserContext | null = null;
  private tracker: InteractionTracker;
  private config: RecordingConfig;
  private screenshotDir: string;
  private screenshotCount = 0;
  private navigationCount = 0;
  private isRecording = false;

  constructor(config: RecordingConfig) {
    this.config = config;
    this.tracker = new InteractionTracker({
      scrollDebounceMs: 500,
      hoverDebounceMs: 300,
    });
    this.screenshotDir = path.join(config.outputDir, 'screenshots', 'recording');
  }

  /**
   * Starts the recording session
   * Launches headed Chromium and sets up event listeners
   */
  async startRecording(): Promise<TestCase> {
    Logger.info('🎬 Starting recording session...');

    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    // Launch headed browser
    this.browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    this.context = await this.browser.newContext({
      viewport: null, // Use full window
      recordVideo: undefined, // Don't record video
    });

    this.page = await this.context.newPage();
    this.isRecording = true;

    // Setup event listeners
    await this.setupEventListeners();

    // Display instructions
    this.displayInstructions();

    // Navigate to starting URL
    Logger.info(`📍 Navigating to: ${this.config.startUrl}`);
    await this.page.goto(this.config.startUrl);
    this.tracker.recordNavigation(this.config.startUrl);

    // Wait for browser to close
    await this.waitForClose();

    // Generate test code
    const testCase = await this.generateTest();

    Logger.success('✅ Recording complete!');
    Logger.info(`📝 Generated test with ${this.tracker.getCount()} interactions`);

    return testCase;
  }

  /**
   * Sets up event listeners for capturing interactions
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.page) return;

    // Inject selector generator script
    await this.page.addInitScript(getInjectedSelectorScript());

    // Listen for navigation
    this.page.on('framenavigated', async (frame) => {
      if (frame === this.page!.mainFrame()) {
        const url = frame.url();
        Logger.info(`🔗 Navigate: ${url}`);
        this.tracker.recordNavigation(url);

        // Auto-screenshot after navigation
        await this.takeAutoScreenshot('navigation');
      }
    });

    // Inject event listeners into page context
    await this.page.evaluate(`
      // Click listener
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (target && target instanceof Element) {
          const selector = window.__generateSelector(target);
          window.__recordedClick = { selector, timestamp: Date.now() };
        }
      }, true);

      // Input listener
      document.addEventListener('input', (e) => {
        const target = e.target;
        if (target && target instanceof HTMLInputElement) {
          const selector = window.__generateSelector(target);
          const value = target.value;
          window.__recordedInput = { selector, value, timestamp: Date.now() };
        }
      }, true);

      // Change listener (for selects)
      document.addEventListener('change', (e) => {
        const target = e.target;
        if (target && target instanceof HTMLSelectElement) {
          const selector = window.__generateSelector(target);
          const value = target.value;
          window.__recordedSelect = { selector, value, timestamp: Date.now() };
        }
      }, true);

      // Scroll listener (debounced)
      let scrollTimeout;
      document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          window.__recordedScroll = {
            x: window.scrollX,
            y: window.scrollY,
            timestamp: Date.now(),
          };
        }, 300);
      }, true);

      // Hover listener (debounced)
      let hoverTimeout;
      let lastHoverTarget = null;
      document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (target && target !== lastHoverTarget) {
          lastHoverTarget = target;
          clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(() => {
            const selector = window.__generateSelector(target);
            window.__recordedHover = { selector, timestamp: Date.now() };
          }, 200);
        }
      }, true);

      // Keyboard listener for screenshot hotkey
      document.addEventListener('keydown', (e) => {
        window.__recordedKeyPress = {
          key: e.key,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          timestamp: Date.now(),
        };
      }, true);
    `);

    // Poll for recorded events
    this.startEventPolling();
  }

  /**
   * Polls for events recorded in page context
   */
  private startEventPolling(): void {
    const pollInterval = setInterval(async () => {
      if (!this.page || !this.isRecording) {
        clearInterval(pollInterval);
        return;
      }

      try {
        // Get recorded events from page context
        const events: any = await this.page.evaluate(`
          (function() {
            const events = {
              click: window.__recordedClick,
              input: window.__recordedInput,
              select: window.__recordedSelect,
              scroll: window.__recordedScroll,
              hover: window.__recordedHover,
              keyPress: window.__recordedKeyPress,
            };

            // Clear the events
            window.__recordedClick = null;
            window.__recordedInput = null;
            window.__recordedSelect = null;
            window.__recordedScroll = null;
            window.__recordedHover = null;
            window.__recordedKeyPress = null;

            return events;
          })()
        `);

        // Process events
        if (events.click) {
          Logger.info(`✓ Click: ${events.click.selector}`);
          this.tracker.recordClick(events.click.selector);
        }

        if (events.input) {
          Logger.info(`✓ Fill: ${events.input.selector} = "${events.input.value}"`);
          this.tracker.recordFill(events.input.selector, events.input.value);
        }

        if (events.select) {
          Logger.info(`✓ Select: ${events.select.selector} = "${events.select.value}"`);
          this.tracker.recordSelect(events.select.selector, events.select.value);
        }

        if (events.scroll) {
          this.tracker.recordScroll(events.scroll.x, events.scroll.y);
        }

        if (events.hover) {
          this.tracker.recordHover(events.hover.selector);
        }

        // Check for screenshot hotkey
        if (events.keyPress) {
          const { key, ctrlKey, shiftKey } = events.keyPress;
          const hotkey = this.config.screenshotHotkey.toLowerCase();

          // Parse hotkey (e.g., "Control+Shift+KeyS")
          if (this.matchesHotkey(key, ctrlKey, shiftKey, false, hotkey)) {
            await this.takeManualScreenshot();
          }
        }
      } catch (error) {
        // Page might be navigating, ignore errors
      }
    }, 100);
  }

  /**
   * Checks if key press matches hotkey configuration
   */
  private matchesHotkey(
    key: string,
    ctrl: boolean,
    shift: boolean,
    alt: boolean,
    hotkeyConfig: string
  ): boolean {
    const parts = hotkeyConfig.toLowerCase().split('+');
    const hasCtrl = parts.includes('control') || parts.includes('ctrl');
    const hasShift = parts.includes('shift');
    const hasAlt = parts.includes('alt');
    const keyPart = parts.find(p => !['control', 'ctrl', 'shift', 'alt'].includes(p));

    return (
      ctrl === hasCtrl &&
      shift === hasShift &&
      alt === hasAlt &&
      key.toLowerCase() === (keyPart || '').replace('key', '')
    );
  }

  /**
   * Takes an automatic screenshot (after navigation)
   */
  private async takeAutoScreenshot(type: string): Promise<void> {
    if (!this.page) return;

    this.navigationCount++;
    const filename = `${type}-${this.navigationCount}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, fullPage: true });
    Logger.info(`📸 Auto-screenshot: ${filename}`);
  }

  /**
   * Takes a manual screenshot (triggered by hotkey)
   */
  private async takeManualScreenshot(): Promise<void> {
    if (!this.page) return;

    this.screenshotCount++;
    const filename = `manual-${this.screenshotCount}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, fullPage: true });
    Logger.success(`📸 Screenshot saved: ${filename}`);

    this.tracker.recordScreenshot(filename);
  }

  /**
   * Waits for the browser to close
   */
  private async waitForClose(): Promise<void> {
    if (!this.browser) return;

    return new Promise((resolve) => {
      this.browser!.on('disconnected', () => {
        this.isRecording = false;
        resolve();
      });
    });
  }

  /**
   * Displays recording instructions
   */
  private displayInstructions(): void {
    Logger.info('');
    Logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.success('🎬 Recording started!');
    Logger.info('');
    Logger.info('💡 Interact with the browser naturally');
    Logger.info(`📸 Press ${this.config.screenshotHotkey} to take a screenshot`);
    Logger.info('🛑 Close the browser window when finished');
    Logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.info('');
  }

  /**
   * Generates test code from recorded interactions
   */
  private async generateTest(): Promise<TestCase> {
    const interactions = this.tracker.getFilteredInteractions();
    const testCode = this.generateTestCode(interactions);

    return {
      route: 'recorded-session',
      path: '/recorded-session',
      testCode,
      type: 'recorded',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts recorded interactions to Playwright test code
   */
  private generateTestCode(interactions: RecordedInteraction[]): string {
    const lines: string[] = [];

    lines.push('export default async function recordedTest({ page, baseUrl, screenshotPath, stepLogger }) {');

    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];

      switch (interaction.type) {
        case 'navigate':
          if (i === 0) {
            // First navigation
            lines.push(`  stepLogger.log('Navigating to ${interaction.url}');`);
            lines.push(`  await page.goto('${interaction.url}');`);
          } else {
            // Subsequent navigations
            lines.push(`  stepLogger.log('Navigating to ${interaction.url}');`);
            lines.push(`  await page.goto('${interaction.url}');`);
          }
          lines.push(`  await page.waitForLoadState('networkidle');`);
          lines.push('');
          break;

        case 'click':
          lines.push(`  stepLogger.log('Clicking: ${interaction.selector}');`);
          lines.push(`  await page.click('${interaction.selector}');`);
          lines.push('');
          break;

        case 'fill':
          lines.push(`  stepLogger.log('Filling: ${interaction.selector}');`);
          lines.push(`  await page.fill('${interaction.selector}', '${this.escapeString(interaction.value || '')}');`);
          lines.push('');
          break;

        case 'select':
          lines.push(`  stepLogger.log('Selecting: ${interaction.selector}');`);
          lines.push(`  await page.selectOption('${interaction.selector}', '${this.escapeString(interaction.value || '')}');`);
          lines.push('');
          break;

        case 'press':
          lines.push(`  stepLogger.log('Pressing: ${interaction.key}');`);
          lines.push(`  await page.press('${interaction.selector}', '${interaction.key}');`);
          lines.push('');
          break;

        case 'scroll':
          if (interaction.scrollPosition) {
            lines.push(`  stepLogger.log('Scrolling to: (${interaction.scrollPosition.x}, ${interaction.scrollPosition.y})');`);
            lines.push(`  await page.evaluate(() => window.scrollTo(${interaction.scrollPosition.x}, ${interaction.scrollPosition.y}));`);
            lines.push('');
          }
          break;

        case 'hover':
          lines.push(`  stepLogger.log('Hovering: ${interaction.selector}');`);
          lines.push(`  await page.hover('${interaction.selector}');`);
          lines.push('');
          break;

        case 'screenshot':
          lines.push(`  stepLogger.log('Taking screenshot: ${interaction.screenshotName}');`);
          lines.push(`  await page.screenshot({ path: screenshotPath, fullPage: true });`);
          lines.push('');
          break;
      }
    }

    // Always end with final screenshot if not already there
    const lastInteraction = interactions[interactions.length - 1];
    if (!lastInteraction || lastInteraction.type !== 'screenshot') {
      lines.push(`  stepLogger.log('Taking final screenshot');`);
      lines.push(`  await page.screenshot({ path: screenshotPath, fullPage: true });`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Escapes strings for code generation
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  /**
   * Closes the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.context = null;
    }
  }
}

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Scanner } from '../../src/scanner';
import { TestGenerator } from '../../src/generator';
import { TestRunner } from '../../src/runner';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DexilionServer } from '../helpers/dexilion-server';
import { DEXILION_PATH, getDexilionConfig, cleanTestOutput, createTempDir } from '../helpers/test-utils';

/**
 * E2E tests for custom test instructions
 * Tests button presses, form interactions, newsletter subscriptions, etc.
 */

describe('Custom Instructions E2E Tests', () => {
  let server: DexilionServer;
  let testDir: string;
  let serverStartedByUs = false;

  const skipIfNoDexilion = async () => {
    const exists = await fs.pathExists(DEXILION_PATH);
    if (!exists) {
      console.warn('Skipping custom instructions tests - dexilion.com path does not exist');
      return true;
    }
    return false;
  };

  beforeAll(async () => {
    if (await skipIfNoDexilion()) return;

    server = new DexilionServer(DEXILION_PATH, 3000);

    // Check if already running
    const isRunning = await server.isReady();
    if (isRunning) {
      console.log('Dev server already running on port 3000');
      serverStartedByUs = false;
      return;
    }

    // Try to start it
    try {
      await server.start();
      await server.waitForReady(60000);
      serverStartedByUs = true;
    } catch (error) {
      // One more check - maybe it started in the meantime
      const nowRunning = await server.isReady();
      if (!nowRunning) {
        throw new Error('Dev server is not running and could not be started');
      }
      console.log('Dev server is running on port 3000');
      serverStartedByUs = false;
    }
  }, 90000);

  afterAll(async () => {
    // Only stop the server if we started it
    if (server && serverStartedByUs) {
      await server.stop();
    }
    await cleanTestOutput();
  });

  beforeEach(async () => {
    await cleanTestOutput();
    testDir = await createTempDir('custom-instructions-test');
  });

  describe('Newsletter subscription interactions', () => {
    it('should include newsletter button click instructions in template', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = 'Click newsletter subscribe button, fill email field with test@example.com, submit form, verify success message';

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-newsletter'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      expect(tests.length).toBeGreaterThan(0);

      // Verify custom instructions are documented in test code
      const testCode = tests[0].code;
      expect(testCode).toContain('newsletter');
      expect(testCode).toContain('test@example.com');
      expect(testCode).toContain('Custom test instructions');
    }, 60000);

    it('should handle complex newsletter interaction instructions', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = `
        1. Scroll to newsletter section
        2. Click subscribe button or input field
        3. Enter email: newsletter-test@dexilion.com
        4. Click submit/subscribe button
        5. Wait for success message or modal
        6. Take screenshot of confirmation
      `.trim();

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-complex-newsletter'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('newsletter');
      expect(testCode).toContain('Custom test instructions');
    }, 60000);
  });

  describe('Form interactions', () => {
    it('should include contact form instructions', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = 'Fill contact form: name=Test User, email=contact@test.com, message=Test message, click submit, verify response';

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-contact'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('contact');
      expect(testCode).toContain('form');
    }, 60000);

    it('should handle multiple form validation scenarios', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = `
        Test form validation:
        - Submit empty form, expect error messages
        - Enter invalid email, expect validation error
        - Enter valid data, expect success
        - Test required field indicators
      `.trim();

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-validation'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('validation');
      expect(testCode).toContain('Custom test instructions');
    }, 60000);
  });

  describe('Button and CTA interactions', () => {
    it('should include button click instructions', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = 'Click all CTA buttons: Get Started, Learn More, Contact Us, Subscribe, verify each opens correct modal or page';

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-buttons'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('CTA');
      expect(testCode).toContain('button');
    }, 60000);

    it('should handle modal and popup interactions', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = `
        Modal interactions:
        - Click button to open modal
        - Wait for modal animation
        - Interact with modal content
        - Close modal
        - Verify modal is closed
      `.trim();

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-modal'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('modal');
      expect(testCode).toContain('Modal interactions');
    }, 60000);
  });

  describe('Navigation and scroll interactions', () => {
    it('should include scroll and navigation instructions', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = `
        Navigation test:
        - Scroll to each section
        - Click navigation links
        - Verify smooth scroll behavior
        - Test mobile menu if present
      `.trim();

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-navigation'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('Navigation test');
      expect(testCode).toContain('Scroll');
    }, 60000);
  });

  describe('Multiple custom instruction scenarios', () => {
    it('should handle comprehensive interaction instructions', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = `
        Complete page interaction test:
        1. Newsletter: Click subscribe, enter test@example.com, submit
        2. Contact: Fill form with test data, submit
        3. Buttons: Click all CTAs and verify behavior
        4. Forms: Test validation on all input fields
        5. Modals: Open and close all modals
        6. Navigation: Test all menu links
        7. Scroll: Scroll to footer and back to top
      `.trim();

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-comprehensive'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 2));

      expect(tests.length).toBeGreaterThan(0);

      // Verify all instruction categories are present
      tests.forEach((test) => {
        const code = test.code;
        expect(code).toContain('Complete page interaction test');
        expect(code).toContain('Newsletter');
        expect(code).toContain('Contact');
        expect(code).toContain('Buttons');
      });
    }, 90000);

    it('should run tests with custom instructions and capture screenshots', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = 'Click newsletter button, wait 2 seconds for animations, scroll to bottom';

      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-screenshots'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const runner = new TestRunner(config);
      const results = await runner.runTests(tests);

      expect(results.length).toBeGreaterThan(0);

      // Verify screenshots were captured
      results.forEach((result) => {
        expect(fs.pathExistsSync(result.screenshot)).toBe(true);
      });
    }, 120000);
  });

  describe('AI mode custom instructions', () => {
    it('should document custom instructions in AI mode template fallback', async () => {
      if (await skipIfNoDexilion()) return;

      const customInstructions = 'Newsletter subscription: click button, fill email, submit form';

      // Use template mode (AI mode would require authentication)
      const config = getDexilionConfig({
        testGenerationMode: 'template',
        customTestInstructions: customInstructions,
        outputDir: path.join(testDir, 'output-ai-template'),
        scanPath: DEXILION_PATH,
      });

      const scanner = new Scanner(config.scanPath, config);
      const routes = await scanner.scan();

      const generator = new TestGenerator(config);
      const tests = await generator.generateTests(routes.slice(0, 1));

      const testCode = tests[0].code;
      expect(testCode).toContain('Newsletter subscription');
      expect(testCode).toContain('Custom test instructions');
    }, 60000);
  });
});

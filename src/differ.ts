import * as fs from 'fs-extra';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { ComparisonResult, TestResult } from './types';

export class Differ {
  constructor(private outputDir: string, private threshold: number = 1) {}

  async compareResults(
    liveResults: TestResult[],
    devResults: TestResult[]
  ): Promise<ComparisonResult[]> {
    const comparisons: ComparisonResult[] = [];
    const diffsDir = path.join(this.outputDir, 'diffs');
    await fs.ensureDir(diffsDir);

    // Create a map of dev results by route for easy lookup
    const devResultsMap = new Map(devResults.map((r) => [r.route, r]));

    for (const liveResult of liveResults) {
      const devResult = devResultsMap.get(liveResult.route);

      if (!devResult) {
        continue;
      }

      // Find all screenshots for this route (handles multiple numbered screenshots)
      const screenshotPairs = await this.findAllScreenshots(liveResult, devResult);

      // Create a comparison for each screenshot pair
      for (const pair of screenshotPairs) {
        const comparison = await this.compareScreenshotFiles(
          liveResult.route,
          pair.live,
          pair.dev,
          pair.index,
          diffsDir
        );

        comparisons.push(comparison);
      }
    }

    return comparisons;
  }

  /**
   * Find all screenshots for a given test route
   * Detects both single screenshots and numbered screenshot series
   */
  private async findAllScreenshots(
    liveResult: TestResult,
    devResult: TestResult
  ): Promise<Array<{ live: string; dev: string; index?: number }>> {
    const pairs: Array<{ live: string; dev: string; index?: number }> = [];

    // Check if numbered screenshots exist (e.g., route-screenshot-1.png, route-screenshot-2.png)
    const liveBase = liveResult.screenshot.replace('.png', '');
    const devBase = devResult.screenshot.replace('.png', '');

    // Try to find numbered screenshots
    let screenshotIndex = 1;
    let foundScreenshot = true;
    while (foundScreenshot) {
      const livePath = `${liveBase}-screenshot-${screenshotIndex}.png`;
      const devPath = `${devBase}-screenshot-${screenshotIndex}.png`;

      const liveExists = await fs.pathExists(livePath);
      const devExists = await fs.pathExists(devPath);

      if (!liveExists && !devExists) {
        foundScreenshot = false; // No more numbered screenshots
        break;
      }

      pairs.push({
        live: livePath,
        dev: devPath,
        index: screenshotIndex,
      });

      screenshotIndex++;
    }

    // If no numbered screenshots found, use the original screenshot path
    if (pairs.length === 0) {
      pairs.push({
        live: liveResult.screenshot,
        dev: devResult.screenshot,
      });
    }

    return pairs;
  }

  private async compareScreenshotFiles(
    route: string,
    liveScreenshotPath: string,
    devScreenshotPath: string,
    index: number | undefined,
    diffsDir: string
  ): Promise<ComparisonResult> {
    try {
      // Read both images
      const liveExists = await fs.pathExists(liveScreenshotPath);
      const devExists = await fs.pathExists(devScreenshotPath);

      if (!liveExists || !devExists) {
        return {
          route: index ? `${route} (screenshot ${index})` : route,
          liveScreenshot: liveScreenshotPath,
          devScreenshot: devScreenshotPath,
          diffPercentage: 100,
          hasDifferences: true,
        };
      }

      const liveImg = PNG.sync.read(await fs.readFile(liveScreenshotPath));
      const devImg = PNG.sync.read(await fs.readFile(devScreenshotPath));

      // Ensure images are the same size
      if (liveImg.width !== devImg.width || liveImg.height !== devImg.height) {
        // Resize to match dimensions (use the smaller of the two)
        const width = Math.min(liveImg.width, devImg.width);
        const height = Math.min(liveImg.height, devImg.height);

        const diff = new PNG({ width, height });

        const numDiffPixels = pixelmatch(
          liveImg.data,
          devImg.data,
          diff.data,
          width,
          height,
          { threshold: this.threshold }
        );

        const totalPixels = width * height;
        const diffPercentage = totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;
        const hasDifferences = diffPercentage > 0.01; // Ignore sub-0.01% differences

        let diffPath: string | undefined;

        if (hasDifferences) {
          // Save diff image
          diffPath = path.join(
            diffsDir,
            path.basename(liveScreenshotPath, '.png') + '-diff.png'
          );

          await fs.writeFile(diffPath, PNG.sync.write(diff));
        }

        return {
          route: index ? `${route} (screenshot ${index})` : route,
          liveScreenshot: liveScreenshotPath,
          devScreenshot: devScreenshotPath,
          diffScreenshot: diffPath,
          diffPercentage: parseFloat(diffPercentage.toFixed(2)),
          hasDifferences,
        };
      }

      const { width, height } = liveImg;
      const diff = new PNG({ width, height });

      const numDiffPixels = pixelmatch(
        liveImg.data,
        devImg.data,
        diff.data,
        width,
        height,
        { threshold: this.threshold }
      );

      const totalPixels = width * height;
      const diffPercentage = totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;
      const hasDifferences = diffPercentage > 0.01; // Ignore sub-0.01% differences

      let diffPath: string | undefined;

      if (hasDifferences) {
        // Save diff image
        diffPath = path.join(
          diffsDir,
          path.basename(liveScreenshotPath, '.png') + '-diff.png'
        );

        await fs.writeFile(diffPath, PNG.sync.write(diff));
      }

      return {
        route: index ? `${route} (screenshot ${index})` : route,
        liveScreenshot: liveScreenshotPath,
        devScreenshot: devScreenshotPath,
        diffScreenshot: diffPath,
        diffPercentage: parseFloat(diffPercentage.toFixed(2)),
        hasDifferences,
      };
    } catch (error) {
      return {
        route: index ? `${route} (screenshot ${index})` : route,
        liveScreenshot: liveScreenshotPath,
        devScreenshot: devScreenshotPath,
        diffPercentage: 100,
        hasDifferences: true,
      };
    }
  }
}

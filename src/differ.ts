import * as fs from 'fs-extra';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { ComparisonResult, TestResult } from './types';

export class Differ {
  constructor(private outputDir: string, private threshold: number = 0.1) {}

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

      const comparison = await this.compareScreenshots(
        liveResult,
        devResult,
        diffsDir
      );

      comparisons.push(comparison);
    }

    return comparisons;
  }

  private async compareScreenshots(
    liveResult: TestResult,
    devResult: TestResult,
    diffsDir: string
  ): Promise<ComparisonResult> {
    try {
      // Read both images
      const liveExists = await fs.pathExists(liveResult.screenshot);
      const devExists = await fs.pathExists(devResult.screenshot);

      if (!liveExists || !devExists) {
        return {
          route: liveResult.route,
          liveScreenshot: liveResult.screenshot,
          devScreenshot: devResult.screenshot,
          diffPercentage: 100,
          hasDifferences: true,
        };
      }

      const liveImg = PNG.sync.read(await fs.readFile(liveResult.screenshot));
      const devImg = PNG.sync.read(await fs.readFile(devResult.screenshot));

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
            path.basename(liveResult.screenshot, '.png') + '-diff.png'
          );

          await fs.writeFile(diffPath, PNG.sync.write(diff));
        }

        return {
          route: liveResult.route,
          liveScreenshot: liveResult.screenshot,
          devScreenshot: devResult.screenshot,
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
          path.basename(liveResult.screenshot, '.png') + '-diff.png'
        );

        await fs.writeFile(diffPath, PNG.sync.write(diff));
      }

      return {
        route: liveResult.route,
        liveScreenshot: liveResult.screenshot,
        devScreenshot: devResult.screenshot,
        diffScreenshot: diffPath,
        diffPercentage: parseFloat(diffPercentage.toFixed(2)),
        hasDifferences,
      };
    } catch (error) {
      return {
        route: liveResult.route,
        liveScreenshot: liveResult.screenshot,
        devScreenshot: devResult.screenshot,
        diffPercentage: 100,
        hasDifferences: true,
      };
    }
  }
}

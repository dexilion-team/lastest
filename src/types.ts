export interface Config {
  aiProvider: 'claude-subscription' | 'copilot-subscription';
  liveUrl: string;
  devUrl: string;
  scanPath: string;
  outputDir: string;
  viewport?: {
    width: number;
    height: number;
  };
  diffThreshold?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface RouteInfo {
  path: string;
  type: 'static' | 'dynamic';
  filePath?: string;
  component?: string;
}

export interface TestCase {
  name: string;
  route: string;
  code: string;
  filePath: string;
}

export interface TestResult {
  route: string;
  url: string;
  environment: 'live' | 'dev';
  passed: boolean;
  screenshot: string;
  duration: number;
  error?: string;
}

export interface ComparisonResult {
  route: string;
  liveScreenshot: string;
  devScreenshot: string;
  diffScreenshot?: string;
  diffPercentage: number;
  hasDifferences: boolean;
}

export interface Report {
  timestamp: string;
  liveUrl: string;
  devUrl: string;
  totalTests: number;
  passed: number;
  failed: number;
  comparisons: ComparisonResult[];
  duration: number;
}

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
  viewports?: Array<{
    name: string;
    slug: string;
    width: number;
    height: number;
  }>;
  diffThreshold?: number;
  parallel?: boolean;
  maxConcurrency?: number;
  useAIRouteDetection?: boolean;
  customTestInstructions?: string;
  testGenerationMode?: 'ai' | 'template' | 'mcp' | 'record';
  recordingStartUrl?: string;
  screenshotHotkey?: string;
}

export interface RouteInfo {
  path: string;
  type: 'static' | 'dynamic';
  filePath?: string;
  component?: string;
  routerType?: 'hash' | 'browser';
  detectedBy?: 'traditional' | 'ai' | 'both';
}

export interface TestCase {
  name?: string;
  route: string;
  path?: string;
  code?: string;
  testCode?: string;
  filePath?: string;
  type?: string;
  generatedAt?: string;
  routerType?: 'hash' | 'browser';
  viewport?: string;
}

export interface TestResult {
  route: string;
  url: string;
  environment: 'live' | 'dev';
  passed: boolean;
  screenshot: string;
  duration: number;
  error?: string;
  detailedResults?: DetailedTestExecution;
  viewport?: string;
}

export interface DetailedTestExecution {
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  retries: number;
  startTime: string;
  endTime: string;
  error?: {
    message: string;
    stack?: string;
  };
  steps?: TestStep[];
}

export interface TestStep {
  title: string;
  duration: number;
  error?: string;
  status?: 'passed' | 'failed';
}

export interface ComparisonResult {
  route: string;
  liveScreenshot: string;
  devScreenshot: string;
  diffScreenshot?: string;
  diffPercentage: number;
  hasDifferences: boolean;
  viewport?: string;
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
  environmentStats?: EnvironmentStats;
  detailedResults?: TestResult[];
}

export interface EnvironmentStats {
  live: {
    total: number;
    passed: number;
    failed: number;
  };
  dev: {
    total: number;
    passed: number;
    failed: number;
  };
}

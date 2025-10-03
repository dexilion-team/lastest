// Export all public API
export { Scanner } from './scanner';
export { TestGenerator } from './generator';
export { TestRunner } from './runner';
export { Differ } from './differ';
export { ReportGenerator } from './reporter';
export { ConfigManager } from './config';
export { Logger } from './utils/logger';

// Export AI clients
export { ClaudeClient } from './ai/claude';
export { ClaudeSubscriptionClient } from './ai/claude-subscription';
export { CopilotSubscriptionClient } from './ai/copilot-subscription';

// Export types
export type {
  Config,
  RouteInfo,
  TestCase,
  TestResult,
  ComparisonResult,
  Report,
} from './types';

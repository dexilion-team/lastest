import { RouteInfo } from '../types';

/**
 * Merges traditional and AI-detected routes with intelligent deduplication.
 * Traditional routes take precedence on conflicts.
 *
 * @param traditionalRoutes - Routes from framework-specific scanners
 * @param aiRoutes - Routes from AI detection
 * @returns Deduplicated routes with tracking metadata
 */
export function mergeRoutes(
  traditionalRoutes: RouteInfo[],
  aiRoutes: RouteInfo[]
): RouteInfo[] {
  // Step 1: Mark all traditional routes and build lookup map
  const traditionalByPath = new Map<string, RouteInfo>();
  const markedTraditional = traditionalRoutes.map(route => {
    const marked = { ...route, detectedBy: 'traditional' as const };
    traditionalByPath.set(route.path, marked);
    return marked;
  });

  // Step 2: Filter AI routes - only keep net-new paths
  const newAIRoutes: RouteInfo[] = [];
  for (const aiRoute of aiRoutes) {
    if (traditionalByPath.has(aiRoute.path)) {
      // Conflict: Mark traditional route as detected by both
      const traditionalRoute = traditionalByPath.get(aiRoute.path)!;
      traditionalRoute.detectedBy = 'both';
    } else {
      // Net-new route from AI
      newAIRoutes.push({
        ...aiRoute,
        detectedBy: 'ai',
      });
    }
  }

  // Step 3: Combine and return
  return [...markedTraditional, ...newAIRoutes];
}

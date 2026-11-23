import { useExpressionQueryReaders } from 'src/core/queries/AppQueriesProvider';
import type { createExpressionQueryReaders } from 'src/core/queries/expressionQueryReaders.queries';

export type ExpressionQueryReaders = ReturnType<typeof createExpressionQueryReaders>;

export { useExpressionQueryReaders };

/**
 * Minimal query-cache observer API for code outside src/core/queries.
 * Consumers can react to cache changes without depending on TanStack Query types or client methods directly.
 */
export interface QueryCacheObserver {
  subscribe: (onChange: () => void) => () => void;
}

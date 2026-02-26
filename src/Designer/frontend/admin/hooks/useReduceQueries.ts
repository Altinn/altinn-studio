import type { UseQueryResult } from '@tanstack/react-query';

type UseReduceQueriesResult<ReturnTypes extends unknown[]> =
  | {
      data: { [I in keyof ReturnTypes]: ReturnTypes[I] };
      status: 'success';
    }
  | {
      data: { [I in keyof ReturnTypes]?: ReturnTypes[I] };
      status: 'pending' | 'error';
    };

// Simple utility for getting a single loading/error state for multiple queries
export function useReduceQueries<ReturnTypes extends unknown[]>(
  ...queries: { [I in keyof ReturnTypes]: UseQueryResult<ReturnTypes[I]> }
): UseReduceQueriesResult<ReturnTypes> {
  const status: UseQueryResult['status'] = queries.reduce((s, query) => {
    const statuses = [s, query.status];
    if (statuses.includes('error')) {
      return 'error';
    }
    if (statuses.includes('pending')) {
      return 'pending';
    }
    return 'success';
  }, 'success');

  return { data: queries.map((query) => query.data) as any, status };
}

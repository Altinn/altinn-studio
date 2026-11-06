import type * as queries from 'src/core/queries/queries';

type KeysStartingWith<T, U extends string> = {
  [K in keyof T as K extends `${U}${string}` ? K : never]: T[K];
};

export type AppQueries = KeysStartingWith<typeof queries, 'fetch' | 'get'>;
export type AppMutations = KeysStartingWith<typeof queries, 'do' | 'create' | 'set'>;
export type AppQueriesContext = AppQueries & AppMutations;

export interface BaseQueryResult {
  error: Error | null;
  isLoading: boolean;
}

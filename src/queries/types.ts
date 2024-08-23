import type * as queries from 'src/queries/queries';

type IgnoredQueries = 'fetchApplicationMetadata' | 'fetchExternalApi';

export type AppQueriesContext = Omit<typeof queries, IgnoredQueries>;

type KeysStartingWith<T, U extends string> = {
  [K in keyof T as K extends `${U}${string}` ? K : never]: T[K];
};

export type AppQueries = Omit<KeysStartingWith<AppQueriesContext, 'fetch'>, IgnoredQueries>;
export type AppMutations = KeysStartingWith<AppQueriesContext, 'do'>;

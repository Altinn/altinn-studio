import type * as queries from 'src/queries/queries';

export type AppQueriesContext = typeof queries;

type KeysStartingWith<T, U extends string> = {
  [K in keyof T as K extends `${U}${string}` ? K : never]: T[K];
};

export type AppQueries = KeysStartingWith<AppQueriesContext, 'fetch'>;
export type AppMutations = KeysStartingWith<AppQueriesContext, 'do'>;

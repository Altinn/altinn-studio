import type * as queries from 'src/queries/queries';

export type AppQueriesContext = typeof queries;

type KeysStartingWith<T, U extends string> = {
  [K in keyof T as K extends `${U}${string}` ? K : never]: T[K];
};

export type AppQueries = KeysStartingWith<AppQueriesContext, 'fetch'>;
export type AppMutations = KeysStartingWith<AppQueriesContext, 'do'>;

export type EnhancedMutations = {
  [K in keyof AppMutations]: {
    call: AppMutations[K];
    lastResult: Awaited<ReturnType<AppMutations[K]>> | undefined;
    setLastResult: (result: Awaited<ReturnType<AppMutations[K]>>) => void;
  };
};

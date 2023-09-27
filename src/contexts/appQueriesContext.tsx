import React, { useState } from 'react';

import { createStrictContext } from 'src/utils/createStrictContext';
import type * as queries from 'src/queries/queries';

type KeysStartingWith<T, U extends string> = {
  [K in keyof T as K extends `${U}${string}` ? K : never]: T[K];
};

export type AppQueriesContext = typeof queries;

type Queries = KeysStartingWith<AppQueriesContext, 'fetch'>;
type Mutations = KeysStartingWith<AppQueriesContext, 'do'>;
export type EnhancedMutations = {
  [K in keyof Mutations]: {
    call: Mutations[K];
    lastResult: Awaited<ReturnType<Mutations[K]>> | undefined;
    setLastResult: (result: Awaited<ReturnType<Mutations[K]>>) => void;
  };
};

interface ContextData {
  queries: Queries;
  mutations: EnhancedMutations;
}

const [Provider, useContext] = createStrictContext<ContextData>();

export const AppQueriesContextProvider = ({ children, ...allQueries }: React.PropsWithChildren<AppQueriesContext>) => {
  const queries = Object.fromEntries(Object.entries(allQueries).filter(([key]) => key.startsWith('fetch'))) as Queries;
  const mutations = Object.fromEntries(Object.entries(allQueries).filter(([key]) => key.startsWith('do'))) as Mutations;

  const enhancedMutations = Object.fromEntries(
    Object.entries(mutations).map(([key, mutation]) => {
      // As long as the queries are all the same each time, this should be fine
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [lastResult, setLastResult] = useState<Awaited<ReturnType<typeof mutation>>>();
      return [key, { call: mutation, lastResult, setLastResult }];
    }),
  ) as EnhancedMutations;

  return (
    <>
      <Provider value={{ queries, mutations: enhancedMutations }}>{children}</Provider>
    </>
  );
};

export const useAppQueries = () => useContext().queries;
export const useAppMutations = () => useContext().mutations;
export const useLastMutationResult = <K extends keyof Mutations>(
  key: K,
): Awaited<ReturnType<Mutations[K]>> | undefined => {
  const { lastResult } = useAppMutations()[key];
  return lastResult;
};

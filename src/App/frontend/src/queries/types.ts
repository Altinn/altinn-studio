import type * as queries from 'src/queries/queries';

type IgnoredQueriesAndMutations = keyof Pick<
  typeof queries,
  | 'fetchApplicationMetadata'
  | 'fetchExternalApi'
  | 'fetchProcessState'
  | 'doProcessNext'
  | 'doUpdateAttachmentTags'
  | 'fetchUserProfile'
  | 'fetchInstanceData'
>;

type KeysStartingWith<T, U extends string> = {
  [K in keyof T as K extends `${U}${string}` ? K : never]: T[K];
};

export type AppQueries = Omit<KeysStartingWith<typeof queries, 'fetch'>, IgnoredQueriesAndMutations>;
export type AppMutations = Omit<KeysStartingWith<typeof queries, 'do'>, IgnoredQueriesAndMutations>;

export type AppQueriesContext = AppQueries & AppMutations;

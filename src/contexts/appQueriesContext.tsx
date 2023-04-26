import React from 'react';

import { createStrictContext } from 'src/utils/createStrictContext';
import type * as queries from 'src/queries/queries';

export type AppQueriesContext = typeof queries;

const [AppQueriesProvider, useAppQueriesContext] = createStrictContext<AppQueriesContext>();

type AppQueriesContextProviderProps = {
  children: React.ReactNode;
} & AppQueriesContext;
export const AppQueriesContextProvider = ({ children, ...queries }: AppQueriesContextProviderProps) => (
  <AppQueriesProvider value={{ ...queries }}>{children}</AppQueriesProvider>
);

export { useAppQueriesContext };

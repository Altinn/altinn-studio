import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { PropsWithChildren } from 'react';

import { AppQueriesProvider } from 'src/core/queries/AppQueriesProvider';
import { setupFakeApp } from 'src/test/renderWithProviders';
import type { QueryOverrides } from 'src/test/renderWithProviders';

export function createQueryTestWrapper(overrides: QueryOverrides = {}, initialPath?: string) {
  const { queryClient, queries, queriesOnly, mutations } = setupFakeApp(overrides);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      {initialPath ? (
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route
              path='/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/*'
              element={children}
            />
          </Routes>
        </MemoryRouter>
      ) : (
        children
      )}
    </AppQueriesProvider>
  );
  return { wrapper: Wrapper, queries: queriesOnly, mutations, queryClient };
}

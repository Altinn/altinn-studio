import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { PropsWithChildren } from 'react';

import { ApiProvider } from 'src/core/contexts/ApiProvider';
import { createTestQueryClient } from 'src/core/queries/queryClient';
import { AppQueryProvider } from 'src/core/queries/QueryProvider';
import { createApiMocks } from 'src/test/apiMocks';
import type { ApiOverrides } from 'src/test/apiMocks';

export function createQueryTestWrapper(overrides: ApiOverrides = {}, initialPath?: string) {
  const apis = createApiMocks(overrides);
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ApiProvider apis={apis}>
      <AppQueryProvider queryClient={queryClient}>
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
      </AppQueryProvider>
    </ApiProvider>
  );
  return { wrapper: Wrapper, apis, queryClient };
}

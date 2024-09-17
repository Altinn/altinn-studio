import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useResetRepositoryMutation } from './useResetRepositoryMutation';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHook } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import React from 'react';

describe('useResetRepositoryMutation', () => {
  it('Calls resetRepoChanges', async () => {
    const { result } = renderUseResetRepositoryMutation();
    await result.current.mutateAsync();
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledTimes(1);
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledWith(org, app);
  });
});

function renderUseResetRepositoryMutation() {
  const client = createQueryClientMock();
  return renderHook(() => useResetRepositoryMutation(org, app), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={client}>
        {children}
      </ServicesContextProvider>
    ),
  });
}

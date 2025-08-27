import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useUpdateSelectedMaskinportenScopesMutation } from './useUpdateSelectedMaskinportenScopesMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import {
  type MaskinportenScope,
  type MaskinportenScopes,
} from 'app-shared/types/MaskinportenScope';

const scopeMock1: MaskinportenScope = {
  scope: 'scope1',
  description: 'description1',
};
const scopeMock2: MaskinportenScope = {
  scope: 'scope2',
  description: 'description2',
};
const maskinportenScopes: MaskinportenScopes = { scopes: [scopeMock1, scopeMock2] };

describe('useUpdateSelectedMaskinportenScopesMutation', () => {
  it('calls updateSelectedMaskinportenScopes with correct arguments and payload', async () => {
    await renderHook();

    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledWith(
      org,
      app,
      maskinportenScopes,
    );
  });

  it('invalidates metadata queries when update is successful', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.SelectedAppScopes, org, app],
    });
  });
});

const renderHook = async ({
  queryClient,
}: {
  queryClient?: QueryClient;
} = {}) => {
  const result = renderHookWithProviders(
    {},
    queryClient,
  )(() => useUpdateSelectedMaskinportenScopesMutation()).renderHookResult.result;
  await waitFor(() => result.current.mutateAsync(maskinportenScopes));
  expect(result.current.isSuccess).toBe(true);
};

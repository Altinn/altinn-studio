import { renderHookWithProviders } from '../../test/mocks';
import { useSchemaMutation } from './useSchemaMutation';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { jsonSchemaMock } from '../../test/jsonSchemaMock';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

// Test data:
const modelPath = 'modelPath';

describe('useSchemaMutation', () => {
  it('Returns correct state and calls saveDataModel with the correct parameters', async () => {
    const saveDataModel = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ saveDataModel });
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isPending);
    expect(saveDataModel).toHaveBeenCalledTimes(1);
    expect(saveDataModel).toHaveBeenCalledWith(org, app, modelPath, jsonSchemaMock);
    await waitFor(() => result.current.isSuccess);
  });

  it('Updates the JsonSchema query cache', async () => {
    const queryClient = createQueryClientMock();
    const {
      renderHookResult: { result },
    } = render({}, queryClient);
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isSuccess);
    expect(queryClient.getQueryData([QueryKey.JsonSchema, org, app, modelPath])).toEqual(
      jsonSchemaMock,
    );
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderHookWithProviders(queries, queryClient)(() => useSchemaMutation());

import { renderHookWithMockStore } from '../../test/mocks';
import { useSchemaMutation } from './useSchemaMutation';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { jsonSchemaMock } from '../../test/jsonSchemaMock';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const modelPath = 'modelPath';
const org = 'org';
const app = 'app';

describe('useSchemaMutation', () => {
  it('Returns correct state and calls saveDatamodel with the correct parameters', async () => {
    const saveDatamodel = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ saveDatamodel });
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isPending);
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    expect(saveDatamodel).toHaveBeenCalledWith(org, app, modelPath, jsonSchemaMock);
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
) => renderHookWithMockStore({}, queries, queryClient)(() => useSchemaMutation());

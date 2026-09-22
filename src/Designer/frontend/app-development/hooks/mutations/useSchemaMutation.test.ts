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
    await waitFor(() => expect(saveDataModel).toHaveBeenCalledTimes(1));
    expect(saveDataModel).toHaveBeenCalledWith(org, app, modelPath, jsonSchemaMock);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Leaves combinations without subschemas out of the saved model but keeps them in the cache', async () => {
    const saveDataModel = jest.fn();
    const queryClient = createQueryClientMock();
    const text = { type: 'string' };
    const model = { type: 'object', properties: { text, combination: { anyOf: [] } } };
    const {
      renderHookResult: { result },
    } = render({ saveDataModel }, queryClient);
    result.current.mutate({ modelPath, model });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(saveDataModel).toHaveBeenCalledWith(org, app, modelPath, {
      type: 'object',
      properties: { text },
    });
    expect(queryClient.getQueryData([QueryKey.JsonSchema, org, app, modelPath])).toEqual(model);
  });

  it('Updates the JsonSchema query cache', async () => {
    const queryClient = createQueryClientMock();
    const {
      renderHookResult: { result },
    } = render({}, queryClient);
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData([QueryKey.JsonSchema, org, app, modelPath])).toEqual(
      jsonSchemaMock,
    );
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderHookWithProviders(queries, queryClient)(() => useSchemaMutation());

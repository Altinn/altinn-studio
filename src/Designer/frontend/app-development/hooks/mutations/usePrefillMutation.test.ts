import { renderHookWithProviders } from '../../test/mocks';
import { usePrefillMutation } from './usePrefillMutation';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { app, org } from '@studio/testing/testids';

const modelPath = 'App/models/model.schema.json';
const prefillConfig: PrefillConfig = { ER: { OrgNumber: 'orgNumberField' } };

describe('usePrefillMutation', () => {
  it('Returns correct state and calls saveDataModelPrefill with the correct parameters', async () => {
    const saveDataModelPrefill = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ saveDataModelPrefill });
    result.current.mutate({ modelPath, prefillConfig });
    await waitFor(() => result.current.isPending);
    expect(saveDataModelPrefill).toHaveBeenCalledTimes(1);
    expect(saveDataModelPrefill).toHaveBeenCalledWith(org, app, modelPath, prefillConfig);
    await waitFor(() => result.current.isSuccess);
  });

  it('Updates the Prefill query cache', async () => {
    const queryClient = createQueryClientMock();
    const {
      renderHookResult: { result },
    } = render({}, queryClient);
    result.current.mutate({ modelPath, prefillConfig });
    await waitFor(() => result.current.isSuccess);
    expect(queryClient.getQueryData([QueryKey.Prefill, org, app, modelPath])).toEqual(
      prefillConfig,
    );
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderHookWithProviders(queries, queryClient)(() => usePrefillMutation());

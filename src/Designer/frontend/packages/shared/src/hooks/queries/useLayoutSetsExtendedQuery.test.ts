import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useLayoutSetsExtendedQuery } from './useLayoutSetsExtendedQuery';
import type { QueryClient, QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { LayoutSetModel } from '../../types/api/dto/LayoutSetModel';
import type { AppVersion } from 'app-shared/types/AppVersion';

const layoutSetsExtendedV4: LayoutSetModel[] = [
  { id: 'layoutSet1', dataType: 'dataType1', type: 'type1', task: { id: 'task1', type: 'data' } },
];
const layoutSetsExtended: LayoutSetModel[] = [
  { id: 'layoutSet2', dataType: 'dataType2', type: 'type2', task: { id: 'task2', type: 'data' } },
];

const getLayoutSetsExtendedV4 = jest.fn(() => Promise.resolve(layoutSetsExtendedV4));
const getLayoutSetsExtended = jest.fn(() => Promise.resolve(layoutSetsExtended));

const versionBelowV9 = '8.0.0';
const versionV9 = '9.0.0';

describe('useLayoutSetsExtendedQuery', () => {
  afterEach(jest.clearAllMocks);

  it('calls getLayoutSetsExtendedV4 with the correct parameters and store the result in the cache with the legacy key when the backend version is below v9', async () => {
    const client = createQueryClientMock();
    await renderUseLayoutSetsExtendedQuery(versionBelowV9, client);
    const key: TanstackQueryKey = [QueryKey.LayoutSetsExtendedV4, org, app];
    expect(getLayoutSetsExtendedV4).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(key)).toEqual(layoutSetsExtendedV4);
  });

  it('calls getLayoutSetsExtended with the correct parameters and store the result in the cache with the new key when the backend version is v9 or above', async () => {
    const client = createQueryClientMock();
    await renderUseLayoutSetsExtendedQuery(versionV9, client);
    const key: TanstackQueryKey = [QueryKey.LayoutSetsExtended, org, app];
    expect(getLayoutSetsExtended).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(key)).toEqual(layoutSetsExtended);
  });

  it('does not fetch while the app version is unavailable', async () => {
    const queries: Partial<ServicesContextProps> = {
      getAppVersion: jest.fn(() => new Promise<AppVersion>(() => {})),
      getLayoutSetsExtendedV4,
      getLayoutSetsExtended,
    };
    const { result } = renderHookWithProviders(() => useLayoutSetsExtendedQuery(org, app), {
      queries,
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.isPending).toBe(true);
    expect(getLayoutSetsExtendedV4).not.toHaveBeenCalled();
    expect(getLayoutSetsExtended).not.toHaveBeenCalled();
  });
});

const renderUseLayoutSetsExtendedQuery = async (
  backendVersion: string,
  queryClient: QueryClient = createQueryClientMock(),
): Promise<void> => {
  const appVersion: AppVersion = { backendVersion, frontendVersion: '4.0.0' };
  const queries: Partial<ServicesContextProps> = {
    getAppVersion: jest.fn(() => Promise.resolve(appVersion)),
    getLayoutSetsExtendedV4,
    getLayoutSetsExtended: getLayoutSetsExtended,
  };
  const { result } = renderHookWithProviders(() => useLayoutSetsExtendedQuery(org, app), {
    queries,
    queryClient,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
};

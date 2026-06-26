import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../testing/mocks';
import { useLayoutSetsExtendedQuery } from './useLayoutSetsExtendedQuery';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';

const layoutSetsExtended: UiFolderLayoutSetModel[] = [
  { id: 'layoutSet1', dataType: 'dataType1', type: 'type1', taskType: 'data' },
];
const getLayoutSetsExtended = jest.fn(() => Promise.resolve(layoutSetsExtended));

describe('useLayoutSetsExtendedQuery', () => {
  afterEach(jest.clearAllMocks);

  it('calls getLayoutSetsExtended and stores the result in the cache', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderHookWithProviders(() => useLayoutSetsExtendedQuery(org, app), {
      queries: { getLayoutSetsExtended },
      queryClient,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key: TanstackQueryKey = [QueryKey.LayoutSetsExtended, org, app];
    expect(getLayoutSetsExtended).toHaveBeenCalledWith(org, app);
    expect(queryClient.getQueryData(key)).toEqual(layoutSetsExtended);
  });
});

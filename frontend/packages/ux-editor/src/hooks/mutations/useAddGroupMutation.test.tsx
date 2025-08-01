import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useAddGroupMutation } from './useAddGroupMutation';
import { renderHookWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { pagesModelMock } from '../../testing/layoutMock';

// Test data
const layoutSetId = 'test-layout-set';
const mockPages: PagesModel = {
  groups: [
    {
      order: [{ id: `${textMock('general.page')}1` }],
    },
  ],
};

const renderHook = async ({
  queryClient = createQueryClientMock(),
  queries = {
    getPages: jest.fn().mockResolvedValue(mockPages),
  },
}: {
  queryClient?: QueryClient;
  queries?: { getPages: jest.Mock };
} = {}) => {
  return renderHookWithProviders(() => useAddGroupMutation(org, app), {
    queries,
    queryClient,
  });
};

describe('useAddGroupMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error if trying to add group to pages without groups', async () => {
    const queryClient = createQueryClientMock();
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesModelMock),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook({ queryClient, queries: services });
    expect(async () => {
      await result.current.mutateAsync();
    }).rejects.toThrow();
  });

  it('successfully adds a new group and invalidates the cache', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const services = {
      getPages: jest.fn().mockResolvedValue(mockPages),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook({ queryClient, queries: services });
    await result.current.mutateAsync();
    expect(services.getPages).toHaveBeenCalledWith(org, app, layoutSetId);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.Pages, org, app, layoutSetId],
    });
  });

  it('correctly calculates next page number when groups are empty', async () => {
    const queryClient = createQueryClientMock();
    const emptyPages: PagesModel = {
      groups: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(emptyPages),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };

    const { result } = await renderHook({ queryClient, queries: services });
    await result.current.mutateAsync();
    expect(services.changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        {
          order: [{ id: `${textMock('general.page')}1` }],
        },
      ],
    });
  });

  it('correctly calculates next page number with multiple groups', async () => {
    const queryClient = createQueryClientMock();
    const multiGroupPages: PagesModel = {
      groups: [
        {
          order: [{ id: `${textMock('general.page')}1` }],
        },
        {
          order: [{ id: `${textMock('general.page')}` }],
        },
      ],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(multiGroupPages),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook({ queryClient, queries: services });
    await result.current.mutateAsync();
    expect(services.changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        ...multiGroupPages.groups,
        {
          order: [{ id: `${textMock('general.page')}1` }],
        },
      ],
    });
  });

  it('handles groups with undefined order when calculating next page number', async () => {
    const queryClient = createQueryClientMock();
    const pagesWithUndefinedOrder: PagesModel = {
      groups: [
        { order: undefined },
        {
          order: [{ id: `${textMock('ux_editor.page_layout_group')} 1` }],
        },
      ],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesWithUndefinedOrder),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook({ queryClient, queries: services });
    await result.current.mutateAsync();
    expect(services.changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        ...pagesWithUndefinedOrder.groups,
        {
          order: [{ id: `${textMock('general.page')}1` }],
        },
      ],
    });
  });

  it('handles page IDs that do not match the regex when calculating next page number', async () => {
    const queryClient = createQueryClientMock();
    const pagesWithNonMatchingId: PagesModel = {
      groups: [{ order: [{ id: 'customPage' }] }, { order: [{ id: 'page1' }] }],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesWithNonMatchingId),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook({ queryClient, queries: services });
    await result.current.mutateAsync();
    expect(services.changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        ...pagesWithNonMatchingId.groups,
        {
          order: [{ id: `${textMock('general.page')}2` }],
        },
      ],
    });
  });

  it('handles undefined groups in updatedPages when adding a new group', async () => {
    const queryClient = createQueryClientMock();
    const pagesWithUndefinedGroups: PagesModel = {
      groups: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesWithUndefinedGroups),
      changePageGroups: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook({ queryClient, queries: services });
    await result.current.mutateAsync();
    expect(services.changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        {
          order: [{ id: `${textMock('general.page')}1` }],
        },
      ],
    });
  });
});

import { renderHookWithProviders } from '../../test/mocks';
import { useAddGroupMutation } from './useAddGroupMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

// Test data
const layoutSetId = 'test-layout-set';
const mockPages: PagesModel = {
  groups: [
    {
      name: 'Layout Set 1',
      order: [{ id: 'page1' }],
    },
  ],
  pages: [],
};
const newGroup: GroupModel = {
  name: 'Layout Set 2',
  order: [{ id: 'page2' }],
};
const updatedPages: PagesModel = {
  groups: [...mockPages.groups, newGroup],
  pages: mockPages.pages,
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'general.page') return 'page';
      if (key === 'general.layout_set') return 'Layout Set';
      return key;
    },
  }),
}));

jest.mock('../../../packages/ux-editor/src/hooks', () => ({
  useAppContext: () => ({
    selectedFormLayoutSetName: layoutSetId,
  }),
}));

jest.mock('app-shared/api/mutations', () => ({
  changePageGroups: jest.fn().mockResolvedValue(undefined),
}));

const renderHook = async ({
  queryClient = createQueryClientMock(),
  services = {
    getPages: jest.fn().mockResolvedValue(mockPages),
  },
  appContext = { selectedFormLayoutSetName: layoutSetId },
}: {
  queryClient?: QueryClient;
  services?: { getPages: jest.Mock };
  appContext?: { selectedFormLayoutSetName: string | undefined };
} = {}) => {
  jest
    .spyOn(require('../../../packages/ux-editor/src/hooks'), 'useAppContext')
    .mockReturnValue(appContext);

  const addGroupResult = renderHookWithProviders(
    services,
    queryClient,
  )(() => useAddGroupMutation(org, app)).renderHookResult.result;

  await waitFor(() => addGroupResult.current.mutateAsync());
  return { addGroupResult, queryClient, services };
};

describe('useAddGroupMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully adds a new group and invalidates the cache', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const services = {
      getPages: jest.fn().mockResolvedValue(mockPages),
    };
    const { changePageGroups } = require('app-shared/api/mutations');

    const { addGroupResult } = await renderHook({ queryClient, services });

    expect(services.getPages).toHaveBeenCalledWith(org, app, layoutSetId);
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, updatedPages);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.Pages, org, app, layoutSetId],
    });
    expect(addGroupResult.current.isSuccess).toBe(true);
  });

  it('correctly calculates next page number when groups are empty', async () => {
    const queryClient = createQueryClientMock();
    const emptyPages: PagesModel = {
      groups: [],
      pages: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(emptyPages),
    };
    const { changePageGroups } = require('app-shared/api/mutations');

    await renderHook({ queryClient, services });

    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        {
          name: 'Layout Set 1',
          order: [{ id: 'page1' }],
        },
      ],
      pages: [],
    });
  });

  it('correctly calculates next page number with multiple groups', async () => {
    const queryClient = createQueryClientMock();
    const multiGroupPages: PagesModel = {
      groups: [
        { name: 'Layout Set 1', order: [{ id: 'page1' }, { id: 'page2' }] },
        { name: 'Layout Set 2', order: [{ id: 'page3' }] },
      ],
      pages: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(multiGroupPages),
    };
    const { changePageGroups } = require('app-shared/api/mutations');

    await renderHook({ queryClient, services });

    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        ...multiGroupPages.groups,
        {
          name: 'Layout Set 3',
          order: [{ id: 'page4' }],
        },
      ],
      pages: [],
    });
  });

  it('handles groups with undefined order when calculating next page number', async () => {
    const queryClient = createQueryClientMock();
    const pagesWithUndefinedOrder: PagesModel = {
      groups: [
        { name: 'Layout Set 1', order: undefined },
        { name: 'Layout Set 2', order: [{ id: 'page1' }] },
      ],
      pages: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesWithUndefinedOrder),
    };
    const { changePageGroups } = require('app-shared/api/mutations');

    await renderHook({ queryClient, services });

    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        ...pagesWithUndefinedOrder.groups,
        {
          name: 'Layout Set 3',
          order: [{ id: 'page2' }],
        },
      ],
      pages: [],
    });
  });

  it('handles page IDs that do not match the regex when calculating next page number', async () => {
    const queryClient = createQueryClientMock();
    const pagesWithNonMatchingId: PagesModel = {
      groups: [
        { name: 'Layout Set 1', order: [{ id: 'customPage' }] },
        { name: 'Layout Set 2', order: [{ id: 'page1' }] },
      ],
      pages: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesWithNonMatchingId),
    };
    const { changePageGroups } = require('app-shared/api/mutations');
    await renderHook({ queryClient, services });
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        ...pagesWithNonMatchingId.groups,
        {
          name: 'Layout Set 3',
          order: [{ id: 'page2' }],
        },
      ],
      pages: [],
    });
  });

  it('handles undefined groups in updatedPages when adding a new group', async () => {
    const queryClient = createQueryClientMock();
    const pagesWithUndefinedGroups: PagesModel = {
      groups: undefined,
      pages: [],
    };
    const services = {
      getPages: jest.fn().mockResolvedValue(pagesWithUndefinedGroups),
    };
    const { changePageGroups } = require('app-shared/api/mutations');
    await renderHook({ queryClient, services });
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetId, {
      groups: [
        {
          name: 'Layout Set 1',
          order: [{ id: 'page1' }],
        },
      ],
      pages: [],
    });
  });
});

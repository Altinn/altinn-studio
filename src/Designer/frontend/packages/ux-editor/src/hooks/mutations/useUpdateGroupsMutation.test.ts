import { org, app } from '@studio/testing/testids';
import { renderHookWithProviders } from '../../testing/mocks';
import { useUpdateGroupsMutation } from './useUpdateGroupsMutation';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

const invalidateQueriesMock = jest.fn();

describe('useUpdateGroupsMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const renderUseUpdateGroupsMutation = (
    org: string,
    app: string,
    layoutSetName: string = 'default',
  ) => {
    return renderHookWithProviders(
      () => {
        const queryClient = useQueryClient();
        queryClient.invalidateQueries = invalidateQueriesMock;
        return useUpdateGroupsMutation(org, app, layoutSetName);
      },
      {
        queries: queriesMock,
      },
    );
  };

  it('should call changePageGroups with correct parameters', async () => {
    renderUseUpdateGroupsMutation(org, app);
    const pageGroups = {
      groups: [
        {
          groupId: 'group1',
          order: [{ id: 'page1' }, { id: 'page2' }],
        },
      ],
    };
    await queriesMock.changePageGroups(org, app, 'default', pageGroups);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(org, app, 'default', pageGroups);
  });

  it('should invalidate queries on success', async () => {
    const { result } = renderUseUpdateGroupsMutation(org, app);
    const pageGroups = {
      groups: [
        {
          groupId: 'group1',
          order: [{ id: 'page1' }, { id: 'page2' }],
        },
      ],
    };
    await result.current.mutateAsync(pageGroups);
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [QueryKey.Pages, org, app, 'default'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [QueryKey.FormLayouts, org, app, 'default'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [QueryKey.FormLayoutSettings, org, app, 'default'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(3);
  });
});

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import { useDeletePageGroupMutation } from './useDeletePageGroupMutation';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

describe('useDeletePageGroupMutation', () => {
  const org = 'org';
  const app = 'app';
  const layoutSetName = 'layoutSetName';

  it('should call changePageGroups and invalidate queries on mutation success', async () => {
    const changePageGroupsMock = jest.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    });

    const pageGroups: PagesModel = {
      groups: [
        {
          name: 'group1',
          order: [],
        },
        {
          name: 'group2',
          order: [],
        },
      ],
    };

    const { result } = renderUseDeletePageGroupMutation(
      org,
      app,
      layoutSetName,
      {
        changePageGroups: changePageGroupsMock,
      },
      queryClient,
    );

    await waitFor(() => {
      result.current.mutate(pageGroups);
    });

    await waitFor(() => {
      expect(changePageGroupsMock).toHaveBeenCalledWith(org, app, layoutSetName, pageGroups);
    });
  });

  it('should handle mutation error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const changePageGroupsMock = jest.fn().mockRejectedValue(new Error('Failed'));
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const pageGroups: PagesModel = {
      groups: [
        {
          name: 'group1',
          order: [],
        },
        {
          name: 'group2',
          order: [],
        },
      ],
    };

    const { result } = renderUseDeletePageGroupMutation(
      org,
      app,
      layoutSetName,
      {
        changePageGroups: changePageGroupsMock,
      },
      queryClient,
    );

    await waitFor(() => {
      expect(result.current.mutateAsync(pageGroups)).rejects.toThrow('Failed');
    });

    await waitFor(() => {
      expect(changePageGroupsMock).toHaveBeenCalledWith(org, app, layoutSetName, pageGroups);
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});

export const renderUseDeletePageGroupMutation = (
  org = 'org',
  app = 'app',
  layoutSetName = 'layoutSetName',
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  }),
) => {
  const allQueries: ServicesContextProps = {
    changePageGroups: jest.fn().mockResolvedValue(undefined),
    ...queries,
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ServicesContextProvider {...allQueries}>{children}</ServicesContextProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useDeletePageGroupMutation(org, app, layoutSetName), {
    wrapper,
  });
};

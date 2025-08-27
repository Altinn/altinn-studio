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
import { org, app, selectedLayoutSet } from '@studio/testing/testids';

const createTestPageGroups = (): PagesModel => ({
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
});

describe('useDeletePageGroupMutation', () => {
  it('should call changePageGroups and invalidate queries on mutation success', async () => {
    const changePageGroupsMock = jest.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: {},
      },
    });
    createTestPageGroups();
    const { result } = renderUseDeletePageGroupMutation(
      org,
      app,
      selectedLayoutSet,
      {
        changePageGroups: changePageGroupsMock,
      },
      queryClient,
    );
    await waitFor(() => {
      result.current.mutate(createTestPageGroups());
    });
    await waitFor(() => {
      expect(changePageGroupsMock).toHaveBeenCalledWith(
        org,
        app,
        selectedLayoutSet,
        createTestPageGroups(),
      );
    });
  });

  it('should handle mutation error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const changePageGroupsMock = jest.fn().mockRejectedValue(new Error('Failed'));
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const pageGroups = createTestPageGroups();
    const { result } = renderUseDeletePageGroupMutation(
      org,
      app,
      selectedLayoutSet,
      {
        changePageGroups: changePageGroupsMock,
      },
      queryClient,
    );

    await waitFor(() => {
      expect(result.current.mutateAsync(pageGroups)).rejects.toThrow('Failed');
    });

    await waitFor(() => {
      expect(changePageGroupsMock).toHaveBeenCalledWith(org, app, selectedLayoutSet, pageGroups);
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
    invalidateQueriesSpy.mockRestore();
  });
});

export const renderUseDeletePageGroupMutation = (
  orgParam = org,
  appParam = app,
  layoutSetName = selectedLayoutSet,
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

  return renderHook(() => useDeletePageGroupMutation(orgParam, appParam, layoutSetName), {
    wrapper,
  });
};

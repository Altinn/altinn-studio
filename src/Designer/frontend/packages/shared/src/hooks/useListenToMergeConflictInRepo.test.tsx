import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useListenToMergeConflictInRepo } from './useListenToMergeConflictInRepo';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import postMessages from 'app-shared/utils/postMessages';
import { app, org } from '@studio/testing/testids';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

jest.mock('app-shared/hooks/queries', () => ({
  useRepoStatusQuery: jest.fn(),
}));

describe('useListenToMergeConflictInRepo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add and remove event listener on mount and unmount', () => {
    const refetchMock = jest.fn();
    (useRepoStatusQuery as jest.Mock).mockReturnValue({ refetch: refetchMock });

    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHookRepoStatusEventListenerHook();

    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should call refetch when receiving the correct message', async () => {
    const refetchMock = jest.fn();
    (useRepoStatusQuery as jest.Mock).mockReturnValue({ refetch: refetchMock });
    renderHookRepoStatusEventListenerHook();

    const event = new MessageEvent('message', { data: postMessages.forceRepoStatusCheck });
    window.dispatchEvent(event);

    await waitFor(() => expect(refetchMock).toHaveBeenCalledTimes(1));
  });

  it('should not call refetch when receiving an incorrect message', () => {
    const refetchMock = jest.fn();
    (useRepoStatusQuery as jest.Mock).mockReturnValue({ refetch: refetchMock });
    renderHookRepoStatusEventListenerHook();

    const event = new MessageEvent('message', { data: 'WRONG_MESSAGE' });
    window.dispatchEvent(event);

    expect(refetchMock).not.toHaveBeenCalled();
  });
});

const renderHookRepoStatusEventListenerHook = () => {
  return renderHook(() => useListenToMergeConflictInRepo(org, app), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock}>{children}</ServicesContextProvider>
    ),
  });
};

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';

const clientsNameMock = ['MessageClientOne', 'MessageClientTwo'];
const webSocketUrlsMock = ['ws://jest-test-mocked-url.com'];

vi.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: {
    getInstance: vi.fn().mockReturnValue({
      onMessageReceived: vi.fn().mockReturnValue(vi.fn()),
    }),
  },
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create web socket connection with provided webSocketUrl', () => {
    renderUseWebSocket();

    expect(WSConnector.getInstance).toHaveBeenCalledWith(webSocketUrlsMock, clientsNameMock);
  });

  it('should provide a function to listen to messages', () => {
    const callback = vi.fn();

    renderUseWebSocket(callback);

    expect(getOnMessageReceivedMock()).toHaveBeenCalledWith(callback);
  });

  it('should unsubscribe the message handler on unmount', () => {
    const { unmount } = renderUseWebSocket();
    const unsubscribe = getOnMessageReceivedMock().mock.results[0].value;
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

const getOnMessageReceivedMock = (): Mock =>
  (WSConnector.getInstance as Mock).mock.results[0].value.onMessageReceived;

const renderUseWebSocket = (onWSMessageReceived = vi.fn()) =>
  renderHook(() =>
    useWebSocket({
      webSocketUrls: webSocketUrlsMock,
      clientsName: clientsNameMock,
      webSocketConnector: WSConnector,
      onWSMessageReceived,
    }),
  );

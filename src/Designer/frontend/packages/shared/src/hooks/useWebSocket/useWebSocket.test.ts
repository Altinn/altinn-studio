import { renderHook } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';

const clientsNameMock = ['MessageClientOne', 'MessageClientTwo'];
const webSocketUrlsMock = ['ws://jest-test-mocked-url.com'];

jest.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: {
    getInstance: jest.fn().mockReturnValue({
      onMessageReceived: jest.fn().mockReturnValue(jest.fn()),
    }),
  },
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create web socket connection with provided webSocketUrl', () => {
    renderUseWebSocket();

    expect(WSConnector.getInstance).toHaveBeenCalledWith(webSocketUrlsMock, clientsNameMock);
  });

  it('should provide a function to listen to messages', () => {
    const callback = jest.fn();

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

const getOnMessageReceivedMock = (): jest.Mock =>
  (WSConnector.getInstance as jest.Mock).mock.results[0].value.onMessageReceived;

const renderUseWebSocket = (onWSMessageReceived = jest.fn()) =>
  renderHook(() =>
    useWebSocket({
      webSocketUrls: webSocketUrlsMock,
      clientsName: clientsNameMock,
      webSocketConnector: WSConnector,
      onWSMessageReceived,
    }),
  );

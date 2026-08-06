import { renderHook } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { getHubConnection } from 'app-shared/websockets/getHubConnection';

jest.mock('app-shared/websockets/getHubConnection');

const webSocketUrl = 'ws://jest-test-mocked-url.com';
const otherWebSocketUrl = 'ws://jest-test-other-url.com';
const methodNames = ['MessageClientOne', 'MessageClientTwo'];

const createConnectionMock = () => ({ on: jest.fn(), off: jest.fn() });

const renderUseWebSocket = (onWSMessageReceived = jest.fn(), webSocketUrls = [webSocketUrl]) =>
  renderHook(() => useWebSocket({ webSocketUrls, methodNames, onWSMessageReceived }));

describe('useWebSocket', () => {
  afterEach(jest.clearAllMocks);

  it('registers each method name on the connection for the url', () => {
    const connection = createConnectionMock();
    (getHubConnection as jest.Mock).mockReturnValue(connection);
    const callback = jest.fn();

    renderUseWebSocket(callback);

    expect(getHubConnection).toHaveBeenCalledWith(webSocketUrl);
    expect(connection.on).toHaveBeenCalledWith('MessageClientOne', callback);
    expect(connection.on).toHaveBeenCalledWith('MessageClientTwo', callback);
  });

  it('registers each method name on the connection for every url', () => {
    const connectionsByUrl: Record<string, ReturnType<typeof createConnectionMock>> = {
      [webSocketUrl]: createConnectionMock(),
      [otherWebSocketUrl]: createConnectionMock(),
    };
    (getHubConnection as jest.Mock).mockImplementation((url: string) => connectionsByUrl[url]);
    const callback = jest.fn();

    renderUseWebSocket(callback, [webSocketUrl, otherWebSocketUrl]);

    expect(getHubConnection).toHaveBeenCalledWith(webSocketUrl);
    expect(getHubConnection).toHaveBeenCalledWith(otherWebSocketUrl);
    methodNames.forEach((methodName) => {
      expect(connectionsByUrl[webSocketUrl].on).toHaveBeenCalledWith(methodName, callback);
      expect(connectionsByUrl[otherWebSocketUrl].on).toHaveBeenCalledWith(methodName, callback);
    });
  });

  it('removes each handler on unmount', () => {
    const connection = createConnectionMock();
    (getHubConnection as jest.Mock).mockReturnValue(connection);
    const callback = jest.fn();

    const { unmount } = renderUseWebSocket(callback);
    unmount();

    expect(connection.off).toHaveBeenCalledWith('MessageClientOne', callback);
    expect(connection.off).toHaveBeenCalledWith('MessageClientTwo', callback);
  });
});

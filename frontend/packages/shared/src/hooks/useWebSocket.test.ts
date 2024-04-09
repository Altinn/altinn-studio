import { renderHook } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';

jest.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: {
    getInstance: jest.fn().mockReturnValue({
      onMessageReceived: jest.fn(),
    }),
  },
}));

describe('useWebSocket', () => {
  it('should create web socket connection with provided webSocketUrl', () => {
    renderHook(() =>
      useWebSocket({
        webSocketUrl: 'ws://jest-test-mocked-url.com',
        webSocketConnector: WSConnector,
      }),
    );
    expect(WSConnector.getInstance).toHaveBeenCalledWith('ws://jest-test-mocked-url.com');
  });

  it('should provide a function to listen to messages', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        webSocketUrl: 'ws://jest-test-mocked-url.com',
        webSocketConnector: WSConnector,
      }),
    );
    const callback = jest.fn();
    result.current.onWSMessageReceived(callback);
    expect(
      WSConnector.getInstance('ws://jest-test-mocked-url.com').onMessageReceived,
    ).toHaveBeenCalledWith(callback);
  });
});

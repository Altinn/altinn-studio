import { WSConnector } from 'app-shared/websockets/WSConnector';
import { WSConnectorMissingWebSocketUrlsException } from 'app-shared/websockets/WSConnectorMissingWebSocketUrlsException';

jest.mock('@microsoft/signalr', () => ({
  ...jest.requireActual('@microsoft/signalr'),
  HubConnection: jest.fn().mockReturnValue({
    start: jest.fn().mockResolvedValue('started'),
  }),
  HubConnectionBuilder: jest.fn(() => ({
    withUrl: jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      start: jest.fn().mockResolvedValue('started'),
    }),
  })),
}));

describe('WSConnector', () => {
  it('should create an instance of WSConnector using singleton pattern', () => {
    const webSocketUrls: Array<string> = [
      'ws://jest-test-mocked-url.com',
      'ws://jest-test-mocked-url-2.com',
    ];
    const result: WSConnector = WSConnector.getInstance(webSocketUrls, [
      'MessageClientOne',
      'MessageClientTwo',
    ]);
    expect(result).toBeInstanceOf(WSConnector);
  });

  it('should return the same instance for the same webSocket urls', () => {
    const webSocketUrls: Array<string> = ['ws://jest-test-same-urls.com'];
    const first = WSConnector.getInstance(webSocketUrls, ['MessageClientOne']);
    const second = WSConnector.getInstance(webSocketUrls, ['MessageClientOne']);
    expect(second).toBe(first);
  });

  it('should return separate instances for different webSocket urls', () => {
    const first = WSConnector.getInstance(['ws://jest-test-hub-a.com'], ['MessageClientOne']);
    const second = WSConnector.getInstance(['ws://jest-test-hub-b.com'], ['MessageClientTwo']);
    expect(second).not.toBe(first);
  });

  it('should be able to create an instance using new keyword', () => {
    const webSocketUrls: Array<string> = [
      'ws://jest-test-mocked-url.com',
      'ws://jest-test-mocked-url-2.com',
    ];
    const result: WSConnector = new WSConnector(webSocketUrls, [
      'MessageClientOne',
      'MessageClientTwo',
    ]);
    expect(result).toBeInstanceOf(WSConnector);
  });

  it('should throw WSConnectorMissingWebSocketUrlsException when no URLs are provided', () => {
    expect(() => {
      new WSConnector([], ['MessageClientOne']);
    }).toThrow(
      new WSConnectorMissingWebSocketUrlsException(
        'No WebSocket URLs provided. WebSocket urls needed to connect to the WS Server',
      ),
    );
  });
});

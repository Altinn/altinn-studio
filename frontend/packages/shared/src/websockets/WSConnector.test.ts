import { WSConnector } from 'app-shared/websockets/WSConnector';

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

  it('should throw error when no URLs are provided', () => {
    expect(() => {
      WSConnector.getInstance([], ['MessageClientOne']);
    }).toThrow('No WebSocket URLs provided. WebSocket urls needed to connect to the WS Server');
  });
});

import { WSConnector } from 'app-shared/websockets/WSConnector';
import { WSConnectorMissingWebSocketUrlsException } from 'app-shared/websockets/WSConnectorMissingWebSocketUrlsException';

jest.mock('@microsoft/signalr', () => {
  const connection = {
    start: jest.fn().mockResolvedValue('started'),
    on: jest.fn(),
    off: jest.fn(),
  };
  return {
    ...jest.requireActual('@microsoft/signalr'),
    __mockConnection: connection,
    HubConnection: jest.fn().mockReturnValue(connection),
    HubConnectionBuilder: jest.fn(() => ({
      withUrl: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(connection),
    })),
  };
});

const { __mockConnection: mockConnection } = jest.requireMock('@microsoft/signalr');
const clientOne = 'MessageClientOne';
const clientTwo = 'MessageClientTwo';

describe('WSConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should register the handler for every client name', () => {
    const connector = new WSConnector(['ws://jest-test-subscribe.com'], [clientOne, clientTwo]);

    connector.onMessageReceived(jest.fn());

    expect(mockConnection.on).toHaveBeenCalledWith(clientOne, expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith(clientTwo, expect.any(Function));
  });

  it('should remove exactly the registered handler when unsubscribing', () => {
    const connector = new WSConnector(['ws://jest-test-unsubscribe.com'], [clientOne]);

    const unsubscribe = connector.onMessageReceived(jest.fn());
    const registeredHandler = mockConnection.on.mock.calls[0][1];
    expect(mockConnection.off).not.toHaveBeenCalled();

    unsubscribe();

    expect(mockConnection.off).toHaveBeenCalledWith(clientOne, registeredHandler);
  });

  it('should not leave the previous handler attached when re-subscribing', () => {
    const connector = new WSConnector(['ws://jest-test-resubscribe.com'], [clientOne]);

    const unsubscribeFirst = connector.onMessageReceived(jest.fn());
    unsubscribeFirst();
    connector.onMessageReceived(jest.fn());

    expect(mockConnection.on).toHaveBeenCalledTimes(2);
    expect(mockConnection.off).toHaveBeenCalledTimes(1);
  });

  it('resolves whenStarted once every connection has started', async () => {
    const connector = WSConnector.getInstance(['ws://jest-test-when-started.com'], [clientOne]);

    await expect(connector.whenStarted()).resolves.toBeUndefined();
  });

  it('resolves whenStarted even when a connection fails to start', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConnection.start.mockRejectedValueOnce(new Error('hub unreachable'));

    const connector = WSConnector.getInstance(['ws://jest-test-failed-start.com'], [clientTwo]);

    await expect(connector.whenStarted()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Connection failed: ', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});

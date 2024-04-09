import { WSConnector } from 'app-shared/websockets/WSConnector';

jest.mock('@microsoft/signalr', () => ({
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
    const webSocketUrl: string = 'ws://jest-test-mocked-url.com';
    const result: WSConnector = WSConnector.getInstance(webSocketUrl);
    expect(result).toBeInstanceOf(WSConnector);
  });

  it('should be able to create an instance using new keyword', () => {
    const webSocketUrl: string = 'ws://jest-test-mocked-url.com';
    const result: WSConnector = new WSConnector(webSocketUrl);
    expect(result).toBeInstanceOf(WSConnector);
  });
});

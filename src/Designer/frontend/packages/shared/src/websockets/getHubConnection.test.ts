import { getHubConnection } from 'app-shared/websockets/getHubConnection';

jest.mock('@microsoft/signalr', () => ({
  ...jest.requireActual('@microsoft/signalr'),
  HubConnectionBuilder: jest.fn(() => ({
    withUrl: jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      start: jest.fn().mockResolvedValue('started'),
    }),
  })),
}));

describe('getHubConnection', () => {
  it('returns the same connection for the same url', () => {
    const first = getHubConnection('ws://jest-test-same-url.com');
    const second = getHubConnection('ws://jest-test-same-url.com');
    expect(second).toBe(first);
  });

  it('returns separate connections for different urls', () => {
    const first = getHubConnection('ws://jest-test-hub-a.com');
    const second = getHubConnection('ws://jest-test-hub-b.com');
    expect(second).not.toBe(first);
  });
});

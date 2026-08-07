import { renderHook } from '@testing-library/react';
import { useAssistantWebSocket } from './useAssistantWebSocket';

const mockInvoke = jest.fn();
const mockConnection = { on: jest.fn(), off: jest.fn(), invoke: mockInvoke };
let mockConnections: Array<typeof mockConnection> = [mockConnection];

jest.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: jest.fn().mockImplementation(() => ({
    get connections() {
      return mockConnections;
    },
  })),
}));

describe('useAssistantWebSocket', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockConnections = [mockConnection];
  });

  it('registers the agent message handler and reports connected', () => {
    const { result } = renderUseAssistantWebSocket();

    expect(mockConnection.on).toHaveBeenCalledWith('ReceiveAgentMessage', expect.any(Function));
    expect(result.current.connectionStatus).toBe('connected');
  });

  describe('respondToPermission', () => {
    it('sends the permission response over the hub connection', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderUseAssistantWebSocket();

      await result.current.respondToPermission('session-1', 'request-1', true);

      expect(mockInvoke).toHaveBeenCalledWith(
        'RespondToPermission',
        'session-1',
        'request-1',
        true,
      );
    });

    it('rethrows when the hub invocation fails', async () => {
      mockInvoke.mockRejectedValue(new Error('Hub disconnected'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderUseAssistantWebSocket();

      await expect(
        result.current.respondToPermission('session-1', 'request-1', false),
      ).rejects.toThrow('Hub disconnected');

      consoleError.mockRestore();
    });

    it('throws when there is no active hub connection', async () => {
      mockConnections = [];
      const { result } = renderUseAssistantWebSocket();

      await expect(
        result.current.respondToPermission('session-1', 'request-1', true),
      ).rejects.toThrow('No active SignalR connection to Altinity hub');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('cancelWorkflow', () => {
    it('sends the cancellation over the hub connection', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderUseAssistantWebSocket();

      await result.current.cancelWorkflow('session-1');

      expect(mockInvoke).toHaveBeenCalledWith('CancelWorkflow', 'session-1');
    });
  });

  describe('registerSession', () => {
    it('registers the session over the hub connection', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderUseAssistantWebSocket();

      await result.current.registerSession('testOrg', 'testApp', 'thread-1');

      expect(mockInvoke).toHaveBeenCalledWith('RegisterSession', 'testOrg', 'testApp', 'thread-1');
    });
  });
});

const renderUseAssistantWebSocket = () => renderHook(() => useAssistantWebSocket());

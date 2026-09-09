import { act, renderHook, waitFor } from '@testing-library/react';
import type { WorkflowEvent } from '@studio/assistant';
import { useAssistantWebSocket } from './useAssistantWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';

const mockInvoke = jest.fn();
type MockConnection = {
  on: jest.Mock;
  off: jest.Mock;
  invoke: jest.Mock;
  state: string;
  onreconnecting: jest.Mock;
  onreconnected: jest.Mock;
  onclose: jest.Mock;
};
// A fresh connection object per test: the hook registers its dispatcher once
// per connection (WeakSet), so reusing one object across tests would leak
// registration state between them.
let mockConnection: MockConnection;
let mockConnections: Array<MockConnection>;

// Never settles by default, so the post-start publish stays out of act().
let mockWhenStarted: () => Promise<void> = () => new Promise<void>(() => {});

const createMockConnection = (state = 'Connected'): MockConnection => ({
  on: jest.fn(),
  off: jest.fn(),
  invoke: mockInvoke,
  state,
  onreconnecting: jest.fn(),
  onreconnected: jest.fn(),
  onclose: jest.fn(),
});

jest.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: {
    getInstance: jest.fn(() => ({
      get connections() {
        return mockConnections;
      },
      whenStarted: () => mockWhenStarted(),
    })),
  },
}));

const mockGetInstance = WSConnector.getInstance as jest.Mock;

describe('useAssistantWebSocket', () => {
  beforeEach(() => {
    mockConnection = createMockConnection();
    mockConnections = [mockConnection];
    mockWhenStarted = () => new Promise<void>(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('acquires the shared hub connection and reports connected', () => {
    const { result } = renderUseAssistantWebSocket();

    expect(mockGetInstance).toHaveBeenCalledWith(expect.any(Array), ['ReceiveAgentMessage']);
    expect(mockConnection.on).toHaveBeenCalledWith('ReceiveAgentMessage', expect.any(Function));
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('settles the status once the initial start resolves', async () => {
    mockConnection = createMockConnection('Connecting');
    mockConnections = [mockConnection];
    mockWhenStarted = () => Promise.resolve();

    const { result } = renderUseAssistantWebSocket();
    expect(result.current.connectionStatus).toBe('connecting');

    mockConnection.state = 'Connected';

    await waitFor(() => expect(result.current.connectionStatus).toBe('connected'));
  });

  it('reports connecting while the hub connection is still starting', () => {
    mockConnection = createMockConnection('Connecting');
    mockConnections = [mockConnection];

    const { result } = renderUseAssistantWebSocket();

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('reports connecting again while SignalR is reconnecting', () => {
    const { result } = renderUseAssistantWebSocket();
    const onReconnecting = mockConnection.onreconnecting.mock.calls[0][0];

    act(() => onReconnecting());

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('reports error when the hub connection closes with an error', () => {
    const { result } = renderUseAssistantWebSocket();
    const onClose = mockConnection.onclose.mock.calls[0][0];

    act(() => onClose(new Error('Hub gone')));

    expect(result.current.connectionStatus).toBe('error');
  });

  it('reports disconnected when the hub connection closes cleanly', () => {
    const { result } = renderUseAssistantWebSocket();
    const onClose = mockConnection.onclose.mock.calls[0][0];

    act(() => onClose());

    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('reports disconnected for a hub state it does not recognise', () => {
    mockConnection = createMockConnection('Disconnecting');
    mockConnections = [mockConnection];

    const { result } = renderUseAssistantWebSocket();

    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('registers a single dispatcher even when the hook mounts twice', () => {
    renderUseAssistantWebSocket();
    renderUseAssistantWebSocket();

    expect(mockConnection.on).toHaveBeenCalledTimes(1);
  });

  it('never detaches the shared handler on unmount', () => {
    const { unmount } = renderUseAssistantWebSocket();
    unmount();

    expect(mockConnection.off).not.toHaveBeenCalled();
  });

  it('keeps delivering messages to a second mount after the first unmounts', () => {
    const { unmount: unmountFirst } = renderUseAssistantWebSocket();
    const { result } = renderUseAssistantWebSocket();
    const received: WorkflowEvent[] = [];
    result.current.onAgentMessage((message) => received.push(message));
    unmountFirst();

    const dispatch = mockConnection.on.mock.calls[0][1];
    const event: WorkflowEvent = {
      type: 'assistant_message',
      session_id: 'thread-1',
      data: { content: 'Svar' },
    };
    dispatch(event);

    expect(received).toEqual([event]);
  });

  it('keeps delivering to other subscribers when one of them throws', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result: first } = renderUseAssistantWebSocket();
    const { result: second } = renderUseAssistantWebSocket();
    first.current.onAgentMessage(() => {
      throw new Error('subscriber crashed');
    });
    const received: WorkflowEvent[] = [];
    second.current.onAgentMessage((message) => received.push(message));

    const dispatch = mockConnection.on.mock.calls[0][1];
    const event: WorkflowEvent = {
      type: 'assistant_message',
      session_id: 'thread-1',
      data: { content: 'Svar' },
    };
    dispatch(event);

    expect(received).toEqual([event]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('filters out the "session created" status noise', () => {
    const { result } = renderUseAssistantWebSocket();
    const received: WorkflowEvent[] = [];
    result.current.onAgentMessage((message) => received.push(message));

    const dispatch = mockConnection.on.mock.calls[0][1];
    dispatch({
      type: 'workflow_status',
      session_id: 'thread-1',
      data: { message: 'Session created' },
    });

    expect(received).toEqual([]);
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

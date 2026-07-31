import { renderHook } from '@testing-library/react';
import type { WorkflowEvent } from '@studio/assistant';
import { useAltinityWebSocket } from './useAltinityWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';

const mockInvoke = jest.fn();
// A fresh connection object per test: the hook registers its dispatcher once
// per connection (WeakSet), so reusing one object across tests would leak
// registration state between them.
let mockConnection: { on: jest.Mock; off: jest.Mock; invoke: jest.Mock };
let mockConnections: Array<typeof mockConnection>;

jest.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: {
    getInstance: jest.fn(() => ({
      get connections() {
        return mockConnections;
      },
    })),
  },
}));

const mockGetInstance = WSConnector.getInstance as jest.Mock;

describe('useAltinityWebSocket', () => {
  beforeEach(() => {
    mockConnection = { on: jest.fn(), off: jest.fn(), invoke: mockInvoke };
    mockConnections = [mockConnection];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('acquires the shared hub connection and reports connected', () => {
    const { result } = renderUseAltinityWebSocket();

    expect(mockGetInstance).toHaveBeenCalledWith(expect.any(Array), ['ReceiveAgentMessage']);
    expect(mockConnection.on).toHaveBeenCalledWith('ReceiveAgentMessage', expect.any(Function));
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('registers a single dispatcher even when the hook mounts twice', () => {
    renderUseAltinityWebSocket();
    renderUseAltinityWebSocket();

    expect(mockConnection.on).toHaveBeenCalledTimes(1);
  });

  it('never detaches the shared handler on unmount', () => {
    const { unmount } = renderUseAltinityWebSocket();
    unmount();

    expect(mockConnection.off).not.toHaveBeenCalled();
  });

  it('keeps delivering messages to a second mount after the first unmounts', () => {
    const { unmount: unmountFirst } = renderUseAltinityWebSocket();
    const { result } = renderUseAltinityWebSocket();
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

  it('filters out the "session created" status noise', () => {
    const { result } = renderUseAltinityWebSocket();
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
      const { result } = renderUseAltinityWebSocket();

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
      const { result } = renderUseAltinityWebSocket();

      await expect(
        result.current.respondToPermission('session-1', 'request-1', false),
      ).rejects.toThrow('Hub disconnected');

      consoleError.mockRestore();
    });

    it('throws when there is no active hub connection', async () => {
      mockConnections = [];
      const { result } = renderUseAltinityWebSocket();

      await expect(
        result.current.respondToPermission('session-1', 'request-1', true),
      ).rejects.toThrow('No active SignalR connection to Altinity hub');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('cancelWorkflow', () => {
    it('sends the cancellation over the hub connection', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderUseAltinityWebSocket();

      await result.current.cancelWorkflow('session-1');

      expect(mockInvoke).toHaveBeenCalledWith('CancelWorkflow', 'session-1');
    });
  });

  describe('registerSession', () => {
    it('registers the session over the hub connection', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderUseAltinityWebSocket();

      await result.current.registerSession('testOrg', 'testApp', 'thread-1');

      expect(mockInvoke).toHaveBeenCalledWith('RegisterSession', 'testOrg', 'testApp', 'thread-1');
    });
  });
});

const renderUseAltinityWebSocket = () => renderHook(() => useAltinityWebSocket());

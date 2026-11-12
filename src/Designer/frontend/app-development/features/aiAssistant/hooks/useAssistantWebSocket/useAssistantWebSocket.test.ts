import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { WorkflowEvent } from '@studio/assistant';
import { useAssistantWebSocket } from './useAssistantWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';

type MockConnection = {
  on: Mock;
  off: Mock;
  state: string;
  onreconnecting: Mock;
  onreconnected: Mock;
  onclose: Mock;
};
// A fresh connection object per test: the hook registers its dispatcher once
// per connection (WeakSet), so reusing one object across tests would leak
// registration state between them.
let mockConnection: MockConnection;
let mockConnections: Array<MockConnection>;

// Never settles by default, so the post-start publish stays out of act().
let mockWhenStarted: () => Promise<void> = () => new Promise<void>(() => {});

const createMockConnection = (state = 'Connected'): MockConnection => ({
  on: vi.fn(),
  off: vi.fn(),
  state,
  onreconnecting: vi.fn(),
  onreconnected: vi.fn(),
  onclose: vi.fn(),
});

vi.mock('app-shared/websockets/WSConnector', () => ({
  WSConnector: {
    getInstance: vi.fn(() => ({
      get connections() {
        return mockConnections;
      },
      whenStarted: () => mockWhenStarted(),
    })),
  },
}));

const mockGetInstance = WSConnector.getInstance as Mock;

describe('useAssistantWebSocket', () => {
  beforeEach(() => {
    mockConnection = createMockConnection();
    mockConnections = [mockConnection];
    mockWhenStarted = () => new Promise<void>(() => {});
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
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
});

const renderUseAssistantWebSocket = () => renderHook(() => useAssistantWebSocket());

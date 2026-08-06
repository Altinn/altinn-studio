import { renderHook, act } from '@testing-library/react';
import type { WorkflowEvent, WorkflowRequest } from '@studio/assistant';
import { useAltinityWebSocket } from './useAltinityWebSocket';
import { getHubConnection } from 'app-shared/websockets/getHubConnection';

jest.mock('app-shared/websockets/getHubConnection');

const invoke = jest.fn();
let connection: { on: jest.Mock; off: jest.Mock; invoke: jest.Mock };

const getRegisteredHandler = () =>
  connection.on.mock.calls[0][1] as (message: WorkflowEvent) => void;
const renderUseAltinityWebSocket = () => renderHook(() => useAltinityWebSocket());

const agentMessage: WorkflowEvent = {
  type: 'assistant_message',
  session_id: 'thread-1',
  data: { content: 'Svar' },
};

const workflowRequest: WorkflowRequest = {
  session_id: 'thread-1',
  goal: 'hei',
  org: 'testOrg',
  app: 'testApp',
  branch: 'main',
  allow_app_changes: true,
};

describe('useAltinityWebSocket', () => {
  beforeEach(() => {
    connection = { on: jest.fn(), off: jest.fn(), invoke };
    (getHubConnection as jest.Mock).mockReturnValue(connection);
  });

  afterEach(jest.clearAllMocks);

  it('subscribes to ReceiveAgentMessage and reports connected', () => {
    const { result } = renderUseAltinityWebSocket();

    expect(connection.on).toHaveBeenCalledWith('ReceiveAgentMessage', expect.any(Function));
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('removes its own handler on unmount', () => {
    const { unmount } = renderUseAltinityWebSocket();
    const handler = getRegisteredHandler();

    unmount();

    expect(connection.off).toHaveBeenCalledWith('ReceiveAgentMessage', handler);
  });

  it('delivers agent messages to the registered callback', () => {
    const { result } = renderUseAltinityWebSocket();
    const received: WorkflowEvent[] = [];
    act(() => result.current.onAgentMessage((message) => received.push(message)));

    act(() => getRegisteredHandler()(agentMessage));

    expect(received).toEqual([agentMessage]);
  });

  it('filters out the "session created" status noise', () => {
    const { result } = renderUseAltinityWebSocket();
    const received: WorkflowEvent[] = [];
    act(() => result.current.onAgentMessage((message) => received.push(message)));

    act(() =>
      getRegisteredHandler()({
        type: 'workflow_status',
        session_id: 'thread-1',
        data: { message: 'Session created' },
      }),
    );

    expect(received).toEqual([]);
  });

  it('sends a permission response over the connection', async () => {
    invoke.mockResolvedValue(undefined);
    const { result } = renderUseAltinityWebSocket();

    await result.current.respondToPermission('session-1', 'request-1', true);

    expect(invoke).toHaveBeenCalledWith('RespondToPermission', 'session-1', 'request-1', true);
  });

  it('cancels a workflow over the connection', async () => {
    invoke.mockResolvedValue(undefined);
    const { result } = renderUseAltinityWebSocket();

    await result.current.cancelWorkflow('session-1');

    expect(invoke).toHaveBeenCalledWith('CancelWorkflow', 'session-1');
  });

  it('registers a session over the connection', async () => {
    invoke.mockResolvedValue(undefined);
    const { result } = renderUseAltinityWebSocket();

    await result.current.registerSession('testOrg', 'testApp', 'thread-1');

    expect(invoke).toHaveBeenCalledWith('RegisterSession', 'testOrg', 'testApp', 'thread-1');
  });

  it('logs and rethrows when a hub invocation fails', async () => {
    const failure = new Error('Hub disconnected');
    invoke.mockRejectedValue(failure);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderUseAltinityWebSocket();

    await expect(
      result.current.respondToPermission('session-1', 'request-1', true),
    ).rejects.toThrow(failure);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to respond to permission request:',
      failure,
    );

    consoleErrorSpy.mockRestore();
  });

  it('logs and rethrows when starting a workflow fails', async () => {
    const failure = new Error('Hub disconnected');
    invoke.mockRejectedValue(failure);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderUseAltinityWebSocket();

    await expect(result.current.startWorkflow(workflowRequest)).rejects.toThrow(failure);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to start workflow:', failure);

    consoleErrorSpy.mockRestore();
  });
});

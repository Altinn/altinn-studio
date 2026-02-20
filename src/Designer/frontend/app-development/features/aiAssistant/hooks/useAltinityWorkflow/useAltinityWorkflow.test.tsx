import { act } from '@testing-library/react';
import { QueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AgentResponse, UserMessage, WorkflowRequest } from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityWorkflow } from './useAltinityWorkflow';
import { useAltinityWebSocket } from '../useAltinityWebSocket/useAltinityWebSocket';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { renderHookWithProviders } from '../../../../test/mocks';
import type { CurrentBranchInfo } from 'app-shared/types/api/BranchTypes';

jest.mock('../useAltinityWebSocket/useAltinityWebSocket');
jest.mock('app-shared/hooks/queries/useCurrentBranchQuery');

const mockUseAltinityWebSocket = useAltinityWebSocket as jest.MockedFunction<
  typeof useAltinityWebSocket
>;
const mockUseCurrentBranchQuery = useCurrentBranchQuery as jest.MockedFunction<
  typeof useCurrentBranchQuery
>;

describe('useAltinityWorkflow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips workflow when message content is empty', async () => {
    const threads = createThreadState();
    const startWorkflow = jest.fn();

    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      sessionId: 'backend-session',
      startWorkflow,
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    const message: UserMessage = {
      author: MessageAuthor.User,
      content: '   ',
      timestamp: new Date(),
    };

    await act(async () => {
      await result.current.onSubmitMessage(message);
    });

    expect(startWorkflow).not.toHaveBeenCalled();
    expect(threads.addMessageToThread).not.toHaveBeenCalled();
  });

  it('starts workflow with backend session id', async () => {
    const threads = createThreadState();
    const startWorkflow = jest.fn<Promise<AgentResponse>, [WorkflowRequest]>().mockResolvedValue({
      accepted: false,
      session_id: 'backend-session',
      message: 'Rejected',
    });

    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      sessionId: 'backend-session',
      startWorkflow,
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    const message: UserMessage = {
      author: MessageAuthor.User,
      content: '  Hello  ',
      timestamp: new Date(),
    };

    await act(async () => {
      await result.current.onSubmitMessage(message);
    });

    expect(threads.setCurrentSession).toHaveBeenCalledWith('backend-session');
    expect(threads.addMessageToThread).toHaveBeenCalledWith(
      'backend-session',
      expect.objectContaining({ author: MessageAuthor.User, content: 'Hello' }),
    );
    expect(startWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'backend-session',
        goal: 'Hello',
        org: 'testOrg',
        app: 'testApp',
        branch: 'feature-branch',
        allow_app_changes: false,
      }),
    );
  });
});

const createThreadState = (): AltinityThreadState => ({
  chatThreads: [],
  currentSessionId: null,
  currentSessionIdRef: { current: null },
  setCurrentSession: jest.fn(),
  selectThread: jest.fn(),
  createNewThread: jest.fn(),
  deleteThread: jest.fn(),
  addMessageToThread: jest.fn(),
  upsertAssistantMessage: jest.fn(),
  updateWorkflowStatusMessage: jest.fn(),
});

const renderUseAltinityWorkflow = (threads: AltinityThreadState) => {
  const queryClient = new QueryClient();
  return renderHookWithProviders({}, queryClient)(() => useAltinityWorkflow(threads))
    .renderHookResult;
};

const createMockCurrentBranchInfo = (
  overrides?: Partial<CurrentBranchInfo>,
): CurrentBranchInfo => ({
  branchName: 'feature-branch',
  commitSha: 'abc123def456',
  isTracking: true,
  remoteName: 'origin',
  ...overrides,
});

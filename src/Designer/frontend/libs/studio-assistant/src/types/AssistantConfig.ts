import type { UserAttachment, Source } from './ChatThread';

export interface AssistantMessageData {
  response?: string;
  message?: string;
  content?: string;
  timestamp?: string | number;
  filesChanged?: string[];
  sources?: Source[];
  mode?: 'chat' | 'edit';
  no_branch_operations?: boolean;
  traceId?: string;
  attachmentInstructionFlagged?: boolean;
  eventId?: string;
  /** Present when the backend already persisted this message; do not persist a copy. */
  persistedMessageId?: string;
}

/**
 * Activity phase the backend emits with status and chunk events. The UI
 * highlights the matching pill in the activity row. Keep these strings in
 * sync with `_PHASE_*` constants in `agents/graph/nodes/agentic_loop_node.py`.
 */
export type WorkflowPhase = 'thinking' | 'reading' | 'writing' | 'verifying' | 'committing';

export interface WorkflowStatusData {
  message?: string;
  status?: string;
  done?: boolean;
  mode?: string;
  phase?: WorkflowPhase;
  /** Milliseconds since the run started, stamped by the agents service.
   *  Lets a tab that adopts an in-flight run anchor its trail timers at the
   *  actual run start instead of at the first event it happens to receive. */
  elapsed_ms?: number;
  /** Stable id of the model's tool_use block. Lets the frontend match
   *  a follow-up call message to its pending placeholder and collapse
   *  them into a single journal entry. */
  tool_use_id?: string;
  /** Marks this status as a placeholder emitted while the model is
   *  still streaming the tool_use input.  Replaced when the call lands. */
  pending?: boolean;
}

export interface WorkflowEventBase {
  session_id?: string;
}

export interface AssistantMessageEvent extends WorkflowEventBase {
  type: 'assistant_message';
  data: AssistantMessageData;
}

export interface WorkflowStatusEvent extends WorkflowEventBase {
  type: 'workflow_status' | 'status';
  data: WorkflowStatusData;
}

export interface AssistantMessageChunkData {
  text: string;
  turn?: number;
  phase?: WorkflowPhase;
}

export interface AssistantMessageChunkEvent extends WorkflowEventBase {
  type: 'assistant_message_chunk';
  data: AssistantMessageChunkData;
}

export interface DoneEvent extends WorkflowEventBase {
  type: 'done';
  data: { success?: boolean; message?: string };
}

export interface ErrorEvent extends WorkflowEventBase {
  type: 'error';
  data: {
    done?: boolean;
    success?: boolean;
    status?: string;
    message?: string;
    /** Alternative goal phrasings the backend suggests when a goal is rejected. */
    suggestions?: string[];
  };
}

/** The agent asks the user to allow changes in a read-only session. */
export interface PermissionRequestEvent extends WorkflowEventBase {
  type: 'permission_request';
  data: {
    request_id: string;
    message?: string;
    /** Set when the prompt was answered (in any tab) or timed out — every
     *  tab showing the run must dismiss its prompt. */
    resolved?: boolean;
    granted?: boolean;
  };
}

export type WorkflowEvent =
  | AssistantMessageEvent
  | AssistantMessageChunkEvent
  | WorkflowStatusEvent
  | DoneEvent
  | ErrorEvent
  | PermissionRequestEvent;

export interface WorkflowRequest {
  session_id: string;
  goal: string;
  org: string;
  app: string;
  branch: string;
  allow_app_changes: boolean;
  attachments?: UserAttachment[];
  repo_url?: string; // Optional - will be built by backend if org/app provided
}

export interface ParsedIntent {
  suggestions?: string[];
  [key: string]: unknown;
}

export interface AgentResponse {
  accepted: boolean;
  session_id: string;
  message: string;
  mode?: 'chat' | 'edit';
  app_name?: string;
  parsed_intent?: ParsedIntent;
}

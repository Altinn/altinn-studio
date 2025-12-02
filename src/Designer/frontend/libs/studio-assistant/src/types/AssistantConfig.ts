import type { AssistantMessage } from './ChatThread';
import type { UserAttachment } from './ChatThread';

export const ErrorMessages = {
  CONNECTION_ERROR: '**Connection Error**',
  REQUEST_REJECTED: '**Request Rejected**',
  REQUEST_FAILED: '**Request Failed**',
  NO_SESSION_AVAILABLE: "No session available. Please ensure you're connected to the server.",
  UNKNOWN_ERROR: 'Unknown error occurred',
} as const;

export interface AssistantMessageData {
  response?: string;
  message?: string;
  content?: string;
  timestamp?: string | number;
  filesChanged?: string[];
  sources?: string[];
  mode?: 'chat' | 'edit';
  no_branch_operations?: boolean;
}

export interface WorkflowStatusData {
  message?: string;
}

export interface WorkflowEventBase {
  session_id?: string;
}

export interface AssistantMessageEvent extends WorkflowEventBase {
  type: 'assistant_message';
  data: AssistantMessageData;
}

export interface WorkflowStatusEvent extends WorkflowEventBase {
  type: 'workflow_status';
  data: WorkflowStatusData;
}

export type WorkflowEvent = AssistantMessageEvent | WorkflowStatusEvent;

export interface WorkflowStatus {
  isActive: boolean;
  sessionId?: string;
  currentStep?: string;
  message?: string;
  lastCompletedAt?: Date;
  filesChanged?: string[];
}

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
  [key: string]: any;
}

export interface AgentResponse {
  accepted: boolean;
  session_id: string;
  message: string;
  mode?: 'chat' | 'edit';
  app_name?: string;
  parsed_intent?: ParsedIntent;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

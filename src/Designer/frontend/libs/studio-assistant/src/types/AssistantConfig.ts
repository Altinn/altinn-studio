import type { AssistantMessage } from './ChatThread';

// Altinity Agent Types
export interface WorkflowEvent {
  type: 'assistant_message';
  data: AssistantMessage;
}

export interface WorkflowStatus {
  isActive: boolean;
  sessionId?: string;
  currentStep?: string;
  message?: string;
  lastCompletedAt?: Date;
  filesChanged?: string[];
}

export interface AgentResponse {
  accepted: boolean;
  session_id: string;
  message: string;
  app_name?: string;
  parsed_intent?: any;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

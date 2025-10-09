import type { MessageAuthor } from './MessageAuthor';

export type AssistantConfig = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  onSubmitMessage: (message: UserMessage) => void;
};

export type AssistantTexts = {
  heading: string;
  preview: string;
  fileBrowser: string;
  hideThreads: string;
  newThread: string;
  previousThreads: string;
  aboutAssistant: string;
  textareaPlaceholder: string;
  addAttachment: string;
  agentModeLabel: string;
  send: string;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt?: string;
  updatedAt?: string;
};

export type UserMessage = {
  author: MessageAuthor.User;
  content: string;
  timestamp: Date;
  allowEditing?: boolean;
};

export type AssistantMessage = {
  author: MessageAuthor.Assistant;
  content: string;
  timestamp: Date;
  filesChanged: string[];
};

// Union type for messages that can be either user or assistant
export type Message = UserMessage | AssistantMessage;

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

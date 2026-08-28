import type { MessageAuthor } from './MessageAuthor';

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
};

export type UserAttachment = {
  name: string;
  mimeType?: string;
  size?: number;
  dataBase64?: string;
};

/**
 * A knowledge source the agent consulted while producing a message —
 * collected from actual tool executions (docs fetches, skill loads,
 * schema lookups), not self-reported by the model.
 */
export type Source = {
  title: string;
  url?: string;
  /** Source category from the agent: 'docs', 'skill' or 'schema'. */
  kind?: string;
  /** Legacy fields from the retired retrieval pipeline — still present
   *  on messages persisted before the agentic-loop architecture. */
  tool?: string;
  previewText?: string;
  contentLength?: number;
  relevance?: number;
  matchedTerms?: string;
  cited?: boolean;
};

export type UserMessage = {
  id?: string;
  role: MessageAuthor.User;
  content: string;
  createdAt: string;
  allowAppChanges: boolean;
  attachments?: UserAttachment[];
};

export type AssistantMessage = {
  id?: string;
  role: MessageAuthor.Assistant;
  content: string;
  createdAt: string;
  filesChanged?: string[];
  sources?: Source[];
  traceId?: string;
  attachmentInstructionFlagged?: boolean;
  feedbackThumbsUp?: boolean;
};

export type Message = UserMessage | AssistantMessage;

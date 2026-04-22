import type { MessageAuthor } from './MessageAuthor';

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt?: string;
};

export type UserAttachment = {
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
};

export type Source = {
  tool: string;
  title: string;
  previewText: string;
  contentLength?: number;
  url?: string;
  relevance?: number;
  matchedTerms?: string;
  cited?: boolean;
};

export type UserMessage = {
  author: MessageAuthor.User;
  content: string;
  createdAt: string;
  allowAppChanges: boolean;
  attachments?: UserAttachment[];
};

export type AssistantMessage = {
  author: MessageAuthor.Assistant;
  content: string;
  createdAt: string;
  filesChanged: string[];
  sources?: Source[];
};

export type Message = UserMessage | AssistantMessage;

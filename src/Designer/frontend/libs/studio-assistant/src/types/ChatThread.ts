import type { MessageAuthor } from './MessageAuthor';

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt?: string;
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
  preview: string;
  content_length?: number;
  url?: string;
  relevance?: number;
  matched_terms?: string;
  cited?: boolean;
};

export type UserMessage = {
  author: MessageAuthor.User;
  content: string;
  timestamp: Date;
  allowAppChanges?: boolean;
  attachments?: UserAttachment[];
};

export type AssistantMessage = {
  author: MessageAuthor.Assistant;
  content: string;
  timestamp: Date;
  filesChanged: string[];
  isLoading?: boolean;
  sources?: Source[];
};

export type Message = UserMessage | AssistantMessage;

import type { MessageAuthor } from './MessageAuthor';

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
  allowAppChanges?: boolean;
};

export type AssistantMessage = {
  author: MessageAuthor.Assistant;
  content: string;
  timestamp: Date;
  filesChanged: string[];
  isLoading?: boolean;
};

export type Message = UserMessage | AssistantMessage;

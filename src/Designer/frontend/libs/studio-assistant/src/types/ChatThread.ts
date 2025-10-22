import type { MessageAuthor } from './MessageAuthor';

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt?: Date;
  updatedAt?: Date;
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
  filesChanged?: string[];
};

export type Message = UserMessage | AssistantMessage;

import type { MessageAuthor } from './MessageAuthor';

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
};

export type Message = {
  author: MessageAuthor;
  content: string;
  timestamp: Date;
  allowEditing?: boolean;
};

type AssistantMessage = {
  author: MessageAuthor.Assistant;
  content: string;
  timestamp: Date;
  filesChanged: string[];
};

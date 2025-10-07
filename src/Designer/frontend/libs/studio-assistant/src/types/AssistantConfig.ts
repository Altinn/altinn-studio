import type { MessageAuthor } from './MessageAuthor';

export type AssistantConfig = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  onSubmitMessage: (message: Message) => void;
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

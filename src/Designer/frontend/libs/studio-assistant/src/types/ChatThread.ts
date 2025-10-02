import type { Message } from './AssistantConfig';

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
};

export type ModeOption = {
  value: string;
  label: string;
};

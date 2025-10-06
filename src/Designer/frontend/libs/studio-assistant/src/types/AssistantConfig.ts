import type { MessageAuthor } from './MessageAuthor';

export type AssistantConfig = {
  heading: string;
  buttonTexts: ButtonTexts;
  onSubmitMessage: (message: Message) => void;
};

export type ButtonTexts = {
  send: string;
};

export type Message = {
  author: MessageAuthor;
  content: string;
  mode?: string;
};

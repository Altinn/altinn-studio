import type { MessageAuthor } from './MessageAuthor';

export type AssistantConfig = {
  heading: string;
  buttonTexts: ButtonTexts;
  onSubmitMessage: (message: Message) => void;
  threads?: Thread[];
};

export type ButtonTexts = {
  send: string;
};

export type Thread = {
  title: string;
  created: Date;
  updated: Date;
  messages: Message[];
};

export type Message = {
  author: MessageAuthor;
  message: string;
  mode?: string;
};

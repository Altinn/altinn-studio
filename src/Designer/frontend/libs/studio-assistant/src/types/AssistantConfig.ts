export type AssistantConfig = {
  heading: string;
  threadNames: string[];
  buttonTexts: ButtonTexts;
  modes: AssistantMode[];
};

type ButtonTexts = {
  send: string;
};

type AssistantMode = {
  name: string;
  description: string;
  thread: ThreadItem[];
  onSendMessage: (message: string) => void;
};

type ThreadItem = {
  author: string;
  message: string;
};

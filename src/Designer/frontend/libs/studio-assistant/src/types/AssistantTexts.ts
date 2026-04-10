import type { ReactNode } from 'react';

export type AssistantTexts = {
  heading: string;
  preview: string;
  fileBrowser: string;
  hideThreads: string;
  showThreads: string;
  newThread: string;
  previousThreads: string;
  aboutAssistant: string;
  aboutAssistantDialog: AboutAssistantDialogTexts;
  textarea: TextAreaTexts;
  addAttachment: string;
  allowAppChangesSwitch: string;
  send: string;
  cancel: string;
  assistantFirstMessage: string;
};

export type AboutAssistantDialogTexts = {
  heading: string;
  description: ReactNode;
  branchInfo: ReactNode;
  branchDocsLink: string;
  disclaimer: string;
};

export type TextAreaTexts = {
  placeholder: string;
  wait: string;
  waitingForConnection: string;
};

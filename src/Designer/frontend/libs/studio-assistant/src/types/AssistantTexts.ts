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
  emptyThread: EmptyThreadTexts;
  textarea: TextAreaTexts;
  addAttachment: string;
  allowAppChangesSwitch: string;
  send: string;
  cancel: string;
  assistantFirstMessage: string;
  feedback: MessageFeedbackTexts;
  criticalFileAlert: CriticalFileAlertTexts;
};

export type CriticalFileAlertTexts = {
  heading: string;
  description: string;
};

export type MessageFeedbackTexts = {
  thumbsUp: string;
  thumbsDown: string;
  heading: string;
  detailsLabel: string;
  detailsOptionalTag: string;
  submit: string;
  cancel: string;
};

export type AboutAssistantDialogTexts = {
  heading: string;
  description: ReactNode;
  branchInfo: ReactNode;
  branchDocsLink: string;
  disclaimer: string;
};

export type EmptyThreadTexts = {
  welcome: string;
  instruction: string;
};

export type TextAreaTexts = {
  placeholder: string;
  wait: string;
  waitingForConnection: string;
};

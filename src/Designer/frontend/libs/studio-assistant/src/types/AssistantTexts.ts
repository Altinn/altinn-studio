export type AssistantTexts = {
  heading: string;
  preview: string;
  fileBrowser: string;
  hideThreads: string;
  showThreads: string;
  newThread: string;
  previousThreads: string;
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
  securityNoticeAlert: SecurityNoticeAlertTexts;
  permissionPrompt: PermissionPromptTexts;
  sourcesLabel: string;
};

export type PermissionPromptTexts = {
  heading: string;
  allow: string;
  deny: string;
};

export type CriticalFileAlertTexts = {
  heading: string;
  description: string;
};

export type SecurityNoticeAlertTexts = {
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
  clear: string;
  cancel: string;
};

export type AboutAssistantDialogTexts = {
  heading: string;
  intro: string;
  assistantDocsInfo: string;
  assistantDocsLink: string;
  disclaimer: string;
  privacyDataHandling: string;
};

export type EmptyThreadTexts = {
  welcome: string;
  instruction: string;
};

export type TextAreaTexts = {
  placeholder: string;
};

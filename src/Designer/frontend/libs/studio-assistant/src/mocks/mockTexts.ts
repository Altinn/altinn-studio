import type {
  AboutAssistantDialogTexts,
  AssistantTexts,
  MessageFeedbackTexts,
  EmptyThreadTexts,
  CriticalFileAlertTexts,
  SecurityNoticeAlertTexts,
  TextAreaTexts,
  PermissionPromptTexts,
} from '../types/AssistantTexts';

const aboutAssistantDialogTexts: AboutAssistantDialogTexts = {
  heading: 'aboutAssistantHeading',
  intro: 'aboutAssistantIntro',
  assistantDocsInfo: 'aboutAssistantDocsInfo',
  assistantDocsLink: 'aboutAssistantDocsLink',
  disclaimer: 'aboutAssistantDisclaimer',
  privacyDataHandling: 'aboutAssistantPrivacyDataHandling',
};

const emptyThreadTexts: EmptyThreadTexts = {
  welcome: 'emptyThreadWelcome',
  instruction: 'emptyThreadInstruction',
};

const textAreaTexts: TextAreaTexts = {
  placeholder: 'placeholder',
};

export const messageFeedbackTexts: MessageFeedbackTexts = {
  thumbsUp: 'feedbackThumbsUp',
  thumbsDown: 'feedbackThumbsDown',
  heading: 'feedbackHeading',
  detailsLabel: 'feedbackDetailsLabel',
  detailsOptionalTag: 'feedbackDetailsOptionalTag',
  submit: 'feedbackSubmit',
  clear: 'feedbackClear',
  cancel: 'feedbackCancel',
};

export const securityNoticeAlertTexts: SecurityNoticeAlertTexts = {
  heading: 'securityNoticeAlertHeading',
  description: 'securityNoticeAlertDescription',
};

export const criticalFileAlertTexts: CriticalFileAlertTexts = {
  heading: 'criticalFileAlertHeading',
  description: 'criticalFileAlertDescription',
};

export const permissionPromptTexts: PermissionPromptTexts = {
  heading: 'permissionPromptHeading',
  allow: 'permissionPromptAllow',
  deny: 'permissionPromptDeny',
};

export const mockTexts: AssistantTexts = {
  heading: 'heading',
  preview: 'preview',
  fileBrowser: 'fileBrowser',
  hideThreads: 'hideThreads',
  showThreads: 'showThreads',
  newThread: 'newThread',
  previousThreads: 'previousThreads',
  aboutAssistantDialog: aboutAssistantDialogTexts,
  emptyThread: emptyThreadTexts,
  textarea: textAreaTexts,
  addAttachment: 'addAttachment',
  allowAppChangesSwitch: 'allowAppChangesSwitch',
  send: 'send',
  cancel: 'cancel',
  assistantFirstMessage: 'Hva kan jeg hjelpe med?',
  feedback: messageFeedbackTexts,
  criticalFileAlert: criticalFileAlertTexts,
  securityNoticeAlert: securityNoticeAlertTexts,
  permissionPrompt: permissionPromptTexts,
  sourcesLabel: 'sourcesLabel',
};

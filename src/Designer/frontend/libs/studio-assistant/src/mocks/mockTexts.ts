import type {
  AboutAssistantDialogTexts,
  AssistantTexts,
  MessageFeedbackTexts,
  EmptyThreadTexts,
  TextAreaTexts,
} from '../types/AssistantTexts';

const aboutAssistantDialogTexts: AboutAssistantDialogTexts = {
  heading: 'aboutAssistantHeading',
  intro: 'aboutAssistantIntro',
  howToHeading: 'aboutAssistantHowToHeading',
  description: 'aboutAssistantDescription',
  branchInfo: 'aboutAssistantBranchInfo',
  branchDocsLink: 'aboutAssistantBranchDocsLink',
  disclaimer: 'aboutAssistantDisclaimer',
  privacyHeading: 'aboutAssistantPrivacyHeading',
  privacyDataHandling: 'aboutAssistantPrivacyDataHandling',
};

const emptyThreadTexts: EmptyThreadTexts = {
  welcome: 'emptyThreadWelcome',
  instruction: 'emptyThreadInstruction',
};

const textAreaTexts: TextAreaTexts = {
  placeholder: 'placeholder',
  wait: 'wait',
  waitingForConnection: 'waitingForConnection',
};

export const messageFeedbackTexts: MessageFeedbackTexts = {
  thumbsUp: 'feedbackThumbsUp',
  thumbsDown: 'feedbackThumbsDown',
  heading: 'feedbackHeading',
  detailsLabel: 'feedbackDetailsLabel',
  detailsOptionalTag: 'feedbackDetailsOptionalTag',
  submit: 'feedbackSubmit',
  cancel: 'feedbackCancel',
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
};

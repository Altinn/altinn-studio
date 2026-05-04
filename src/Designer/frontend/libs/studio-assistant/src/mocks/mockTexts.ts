import type {
  AboutAssistantDialogTexts,
  AssistantTexts,
  TextAreaTexts,
} from '../types/AssistantTexts';

const aboutAssistantDialogTexts: AboutAssistantDialogTexts = {
  heading: 'aboutAssistantHeading',
  description: 'aboutAssistantDescription',
  branchInfo: 'aboutAssistantBranchInfo',
  branchDocsLink: 'aboutAssistantBranchDocsLink',
  disclaimer: 'aboutAssistantDisclaimer',
};

const textAreaTexts: TextAreaTexts = {
  placeholder: 'placeholder',
  wait: 'wait',
  waitingForConnection: 'waitingForConnection',
};

export const mockTexts: AssistantTexts = {
  heading: 'heading',
  preview: 'preview',
  fileBrowser: 'fileBrowser',
  hideThreads: 'hideThreads',
  showThreads: 'showThreads',
  newThread: 'newThread',
  previousThreads: 'previousThreads',
  aboutAssistant: 'aboutAssistant',
  aboutAssistantDialog: aboutAssistantDialogTexts,
  textarea: textAreaTexts,
  addAttachment: 'addAttachment',
  allowAppChangesSwitch: 'allowAppChangesSwitch',
  send: 'send',
  cancel: 'cancel',
  assistantFirstMessage: 'Hva kan jeg hjelpe med?',
};

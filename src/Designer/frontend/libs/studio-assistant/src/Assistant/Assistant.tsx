import React from 'react';
import type { ChatThread, Message } from '../types/ChatThread';
import { InterfaceSimple } from '../components/InterfaceSimple/InterfaceSimple';
import { InterfaceAdvanced } from '../components/InterfaceAdvanced/InterfaceAdvanced';
import type { AssistantTexts } from '../types/AssistantTexts';

export type AssistantProps = {
  texts: AssistantTexts;
  enableSimpleMode: boolean;
  chatThreads: ChatThread[];
  onSubmitMessage: (message: Message) => void;
};

export function Assistant({
  texts,
  enableSimpleMode,
  chatThreads,
  onSubmitMessage,
}: AssistantProps): React.ReactElement {
  return enableSimpleMode ? (
    <InterfaceSimple texts={texts} onSubmitMessage={onSubmitMessage} />
  ) : (
    <InterfaceAdvanced texts={texts} chatThreads={chatThreads} onSubmitMessage={onSubmitMessage} />
  );
}

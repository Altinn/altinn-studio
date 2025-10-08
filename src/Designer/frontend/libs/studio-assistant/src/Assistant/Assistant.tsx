import React from 'react';
import { AssistantConfig } from '../types/AssistantConfig';
import { InterfaceSimple } from '../components/InterfaceSimple/InterfaceSimple';
import { InterfaceAdvanced } from '../components/InterfaceAdvanced/InterfaceAdvanced';

export function Assistant({
  texts,
  enableSimpleMode,
  chatThreads,
  onSubmitMessage,
}: AssistantConfig): React.ReactElement {
  return enableSimpleMode ? (
    <InterfaceSimple texts={texts} onSubmitMessage={onSubmitMessage} />
  ) : (
    <InterfaceAdvanced texts={texts} chatThreads={chatThreads} onSubmitMessage={onSubmitMessage} />
  );
}

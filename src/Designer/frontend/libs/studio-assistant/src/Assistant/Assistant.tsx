import React from 'react';
import type { ChatThread, Message } from '../types/ChatThread';
import { CompactInterface } from '../components/CompactInterface/CompactInterface';
import { CompleteInterface } from '../components/CompleteInterface/CompleteInterface';
import type { AssistantTexts } from '../types/AssistantTexts';

export type AssistantProps = {
  texts: AssistantTexts;
  enableCompactInterface: boolean;
  chatThreads: ChatThread[];
  onSubmitMessage: (message: Message) => void;
};

export function Assistant({
  texts,
  enableCompactInterface,
  chatThreads,
  onSubmitMessage,
}: AssistantProps): React.ReactElement {
  return enableCompactInterface ? (
    <CompactInterface texts={texts} onSubmitMessage={onSubmitMessage} />
  ) : (
    <CompleteInterface texts={texts} chatThreads={chatThreads} onSubmitMessage={onSubmitMessage} />
  );
}

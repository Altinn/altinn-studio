import React from 'react';
import type { ChatThread, Message } from '../types/ChatThread';
import { CompactInterface } from '../components/CompactInterface/CompactInterface';
import { CompleteInterface } from '../components/CompleteInterface/CompleteInterface';
import type { AssistantTexts } from '../types/AssistantTexts';

export type AssistantProps = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  onSubmitMessage: (message: Message) => void;
  enableCompactInterface?: boolean;
};

export function Assistant({
  texts,
  chatThreads,
  onSubmitMessage,
  enableCompactInterface = false,
}: AssistantProps): React.ReactElement {
  return enableCompactInterface ? (
    <CompactInterface texts={texts} onSubmitMessage={onSubmitMessage} />
  ) : (
    <CompleteInterface texts={texts} chatThreads={chatThreads} onSubmitMessage={onSubmitMessage} />
  );
}

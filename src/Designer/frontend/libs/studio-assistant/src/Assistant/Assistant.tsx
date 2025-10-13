import React from 'react';
import type { ChatThread, UserMessage } from '../types/ChatThread';
import { CompactInterface } from '../components/CompactInterface/CompactInterface';
import { CompleteInterface } from '../components/CompleteInterface/CompleteInterface';
import type { AssistantTexts } from '../types/AssistantTexts';

export type AssistantProps = {
  texts: AssistantTexts;
  onSubmitMessage: (message: UserMessage) => void;
  chatThreads?: ChatThread[];
  enableCompactInterface?: boolean;
};

export function Assistant({
  texts,
  onSubmitMessage,
  chatThreads,
  enableCompactInterface = false,
}: AssistantProps): React.ReactElement {
  return enableCompactInterface ? (
    <CompactInterface texts={texts} onSubmitMessage={onSubmitMessage} />
  ) : (
    <CompleteInterface texts={texts} onSubmitMessage={onSubmitMessage} chatThreads={chatThreads} />
  );
}

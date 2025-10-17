import React from 'react';
import type { ChatThread, UserMessage } from '../types/ChatThread';
import { CompactInterface } from '../components/CompactInterface/CompactInterface';
import { CompleteInterface } from '../components/CompleteInterface/CompleteInterface';
import type { AssistantTexts } from '../types/AssistantTexts';
import type { ConnectionStatus } from '../types/ConnectionStatus';
import type { WorkflowStatus } from '../types/WorkflowStatus';

export type AssistantProps = {
  texts: AssistantTexts;
  chatThreads?: ChatThread[];
  enableCompactInterface?: boolean;
  activeThreadId: string;
  connectionStatus: ConnectionStatus;
  onSubmitMessage: (message: UserMessage) => void;
  onSelectThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCreateThread?: () => void;
  workflowStatus: WorkflowStatus;
};

export function Assistant({
  texts,
  chatThreads,
  enableCompactInterface = false,
  activeThreadId,
  connectionStatus,
  workflowStatus,
  onSubmitMessage,
  onSelectThread,
  onDeleteThread,
  onCreateThread,
}: AssistantProps): React.ReactElement {
  return enableCompactInterface ? (
    <CompactInterface texts={texts} onSubmitMessage={onSubmitMessage} />
  ) : (
    <CompleteInterface
      texts={texts}
      chatThreads={chatThreads}
      activeThreadId={activeThreadId}
      connectionStatus={connectionStatus}
      workflowStatus={workflowStatus}
      onSubmitMessage={onSubmitMessage}
      onSelectThread={onSelectThread}
      onDeleteThread={onDeleteThread}
      onCreateThread={onCreateThread}
    />
  );
}

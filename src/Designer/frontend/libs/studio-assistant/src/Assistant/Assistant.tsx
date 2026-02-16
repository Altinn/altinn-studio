import React from 'react';
import type { ReactElement } from 'react';
import type { ChatThread, UserMessage } from '../types/ChatThread';
import { CompactInterface } from '../components/CompactInterface/CompactInterface';
import { CompleteInterface } from '../components/CompleteInterface/CompleteInterface';
import type { AssistantTexts } from '../types/AssistantTexts';
import type { WorkflowStatus } from '../types/WorkflowStatus';
import type { User } from '../types/User';

export type AssistantProps = {
  texts: AssistantTexts;
  chatThreads?: ChatThread[];
  enableCompactInterface?: boolean;
  activeThreadId: string;
  onSubmitMessage: (message: UserMessage) => void;
  onSelectThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCreateThread?: () => void;
  workflowStatus: WorkflowStatus;
  previewContent: ReactElement;
  fileBrowserContent?: ReactElement;
  currentUser?: User;
};

export function Assistant({
  texts,
  chatThreads,
  enableCompactInterface = false,
  activeThreadId,
  workflowStatus,
  onSubmitMessage,
  onSelectThread,
  onDeleteThread,
  onCreateThread,
  previewContent,
  fileBrowserContent,
  currentUser,
}: AssistantProps): React.ReactElement {
  return enableCompactInterface ? (
    <CompactInterface texts={texts} onSubmitMessage={onSubmitMessage} currentUser={currentUser} />
  ) : (
    <CompleteInterface
      texts={texts}
      chatThreads={chatThreads}
      activeThreadId={activeThreadId}
      workflowStatus={workflowStatus}
      onSubmitMessage={onSubmitMessage}
      onSelectThread={onSelectThread}
      onDeleteThread={onDeleteThread}
      onCreateThread={onCreateThread}
      previewContent={previewContent}
      fileBrowserContent={fileBrowserContent}
      currentUser={currentUser}
    />
  );
}

import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import type { ChatThread } from '../../types/ChatThread';
import classes from './ChatHistorySidebar.module.css';

export type ChatHistorySidebarProps = {
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
};

export function ChatHistorySidebar({
  chatThreads,
  selectedThreadId,
  onSelectThread,
}: ChatHistorySidebarProps): ReactElement {
  return (
    <div className={classes.container}>
      <StudioContentMenu.Static selectedTabId={selectedThreadId} onChangeTab={onSelectThread}>
        {chatThreads.map((thread) => (
          <StudioContentMenu.ButtonTab key={thread.id} tabId={thread.id} tabName={thread.title}>
            <div className={classes.threadTimestamp}>{formatTimestamp(thread.timestamp)}</div>
          </StudioContentMenu.ButtonTab>
        ))}
      </StudioContentMenu.Static>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
}

import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu, StudioButton, StudioHeading } from '@studio/components';
import classes from './ThreadColumn.module.css';
import type { AssistantTexts, ChatThread } from '../../types/AssistantConfig';
import { InformationIcon, PlusIcon, SidebarLeftIcon } from '@studio/icons';
type ThreadMenuTabProps = {
  thread: ChatThread;
  onDelete?: () => void;
};

const ThreadMenuTab = ({ thread, onDelete }: ThreadMenuTabProps): ReactElement => {
  return (
    <div className={classes.threadMenuTab}>
      <StudioContentMenu.ButtonTab tabId={thread.id} tabName={thread.title} icon='' />
      {onDelete && (
        <StudioButton
          variant='tertiary'
          className={classes.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title='Delete thread'
        >
          ×
        </StudioButton>
      )}
    </div>
  );
};

export type ChatHistorySidebarProps = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  currentSessionId?: string;
  onSelectThread: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onToggleCollapse?: () => void;
  onCreateThread?: () => void;
};

export function ThreadColumn({
  texts,
  chatThreads,
  selectedThreadId,
  currentSessionId,
  onSelectThread,
  onDeleteThread,
  onToggleCollapse,
  onCreateThread,
}: ChatHistorySidebarProps): ReactElement {
  return (
    <div className={classes.historyColumn}>
      <div className={classes.threadButtons}>
        <StudioButton variant='secondary' onClick={onToggleCollapse}>
          <SidebarLeftIcon />
          {texts.hideThreads}
        </StudioButton>
        <StudioButton onClick={onCreateThread}>
          <PlusIcon />
          {texts.newThread}
        </StudioButton>
      </div>
      <StudioHeading level={3} className={classes.threadHeading}>
        {texts.previousThreads}
      </StudioHeading>
      <StudioContentMenu selectedTabId={selectedThreadId} onChangeTab={onSelectThread}>
        {chatThreads.map((thread) => (
          <ThreadMenuTab
            key={thread.id}
            thread={thread}
            onDelete={onDeleteThread ? () => onDeleteThread(thread.id) : undefined}
          />
        ))}
      </StudioContentMenu>
      <div className={classes.aboutSection}>
        <StudioButton variant='tertiary'>
          <InformationIcon />
          {texts.aboutAssistant}
        </StudioButton>
      </div>
    </div>
  );
}

import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu, StudioButton, StudioHeading } from '@studio/components';
import classes from './ThreadColumn.module.css';
import { InformationIcon, PlusIcon, SidebarLeftIcon } from '@studio/icons';
import type { ChatThread } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type ThreadColumnProps = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  currentSessionId?: string;
  onToggleCollapse?: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCreateThread?: () => void;
};

export function ThreadColumn({
  texts,
  chatThreads,
  selectedThreadId,
  currentSessionId,
  onToggleCollapse,
  onSelectThread,
  onDeleteThread,
  onCreateThread,
}: ThreadColumnProps): ReactElement {
  return (
    <div className={classes.threadColumn}>
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
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            onDelete={onDeleteThread ? () => onDeleteThread(thread.id) : undefined}
          />
        ))}
      </StudioContentMenu>
      <div className={classes.aboutSection}>
        <StudioButton variant='tertiary'>
          {' '}
          {/* TODO: "About assistant" button should open a modal */}
          <InformationIcon />
          {texts.aboutAssistant}
        </StudioButton>
      </div>
    </div>
  );
}

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

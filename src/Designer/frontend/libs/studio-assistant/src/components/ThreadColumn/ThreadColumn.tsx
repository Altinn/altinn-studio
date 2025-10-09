import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu, StudioButton, StudioHeading } from '@studio/components';
import classes from './ThreadColumn.module.css';
import { InformationIcon, PlusIcon, SidebarLeftIcon } from '@studio/icons';
import type { ChatThread } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type ChatHistorySidebarProps = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onToggleCollapse?: () => void;
};

export function ThreadColumn({
  texts,
  chatThreads,
  selectedThreadId,
  onSelectThread,
  onToggleCollapse,
}: ChatHistorySidebarProps): ReactElement {
  return (
    <div className={classes.threadColumn}>
      <div className={classes.threadButtons}>
        <StudioButton variant='secondary' onClick={onToggleCollapse}>
          <SidebarLeftIcon />
          {texts.hideThreads}
        </StudioButton>
        {/* TODO: "New thread" button should create a new thread */}
        <StudioButton>
          <PlusIcon />
          {texts.newThread}
        </StudioButton>
      </div>
      <StudioHeading level={3} className={classes.threadHeading}>
        {texts.previousThreads}
      </StudioHeading>
      <StudioContentMenu selectedTabId={selectedThreadId} onChangeTab={onSelectThread}>
        {chatThreads.map((thread) => (
          <StudioContentMenu.ButtonTab
            key={thread.id}
            tabId={thread.id}
            tabName={thread.title}
            icon={''}
          />
        ))}
      </StudioContentMenu>
      {/* TODO: "About assistant" button should open a modal */}
      <div className={classes.aboutSection}>
        <StudioButton variant='tertiary'>
          <InformationIcon />
          {texts.aboutAssistant}
        </StudioButton>
      </div>
    </div>
  );
}

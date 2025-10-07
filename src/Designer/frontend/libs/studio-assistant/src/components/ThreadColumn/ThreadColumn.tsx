import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu, StudioButton, StudioHeading } from '@studio/components';
import classes from './ThreadColumn.module.css';
import { InformationIcon, PlusIcon, SidebarLeftIcon } from '@studio/icons';
import { ThreadColumnHidden } from '../ThreadColumnHidden/ThreadColumnHidden';
import type { AssistantTexts, ChatThread } from '../../types/AssistantConfig';

export type ChatHistorySidebarProps = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ThreadColumn({
  texts,
  chatThreads,
  selectedThreadId,
  onSelectThread,
  isCollapsed = false,
  onToggleCollapse,
}: ChatHistorySidebarProps): ReactElement {
  if (isCollapsed) {
    return <ThreadColumnHidden onToggle={onToggleCollapse} />;
  }

  return (
    <div className={classes.historyColumn}>
      <div className={classes.threadButtons}>
        <StudioButton variant='secondary' onClick={onToggleCollapse}>
          <SidebarLeftIcon />
          {texts.hideThreads}
        </StudioButton>
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
      <div className={classes.aboutSection}>
        <StudioButton variant='tertiary'>
          <InformationIcon />
          {texts.aboutAssistant}
        </StudioButton>
      </div>
    </div>
  );
}

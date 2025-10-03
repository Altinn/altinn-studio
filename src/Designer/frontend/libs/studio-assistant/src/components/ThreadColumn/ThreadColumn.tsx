import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu, StudioButton, StudioHeading } from '@studio/components';
import type { ChatThread } from '../../types/ChatThread';
import classes from './ThreadColumn.module.css';
import { PlusIcon, SidebarLeftIcon } from '@studio/icons';
import { ThreadColumnHidden } from '../ThreadColumnHidden/ThreadColumnHidden';

export type ChatHistorySidebarProps = {
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ThreadColumn({
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
      <div className={classes.sideBarButtons}>
        <StudioButton>
          <PlusIcon />
          Ny tråd
        </StudioButton>
        <StudioButton variant='secondary' onClick={onToggleCollapse}>
          <SidebarLeftIcon />
        </StudioButton>
      </div>
      <StudioHeading className={classes.elementWithMargin}>Tidligere tråder</StudioHeading>
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
    </div>
  );
}

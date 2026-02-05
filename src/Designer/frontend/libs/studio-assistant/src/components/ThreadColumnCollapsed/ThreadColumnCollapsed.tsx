import React from 'react';
import { StudioButton } from '@studio/components';
import { SidebarLeftIcon, PlusIcon } from '@studio/icons';
import classes from './ThreadColumnCollapsed.module.css';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type ThreadColumnHiddenProps = {
  texts: AssistantTexts;
  onToggleCollapse: () => void;
  onCreateThread?: () => void;
};

export function ThreadColumnCollapsed({
  texts,
  onToggleCollapse,
  onCreateThread,
}: ThreadColumnHiddenProps): React.ReactElement {
  return (
    <div className={classes.threadColumnCollapsed}>
      <div className={classes.buttons}>
        <StudioButton
          variant='secondary'
          onClick={onToggleCollapse}
          aria-label={texts.showThreads}
          title={texts.showThreads}
        >
          <SidebarLeftIcon />
        </StudioButton>
        <StudioButton onClick={onCreateThread} aria-label={texts.newThread} title={texts.newThread}>
          <PlusIcon />
        </StudioButton>
      </div>
    </div>
  );
}

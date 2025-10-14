import React from 'react';
import { StudioButton } from '@studio/components';
import { SidebarLeftIcon, PlusIcon } from '@studio/icons';
import classes from './ThreadColumnCollapsed.module.css';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type ThreadColumnHiddenProps = {
  texts: AssistantTexts;
  onToggleCollapse: () => void;
};

export function ThreadColumnCollapsed({
  texts,
  onToggleCollapse,
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
        <StudioButton aria-label={texts.newThread} title={texts.newThread}>
          <PlusIcon />
        </StudioButton>
      </div>
    </div>
  );
}

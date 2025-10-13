import React from 'react';
import { StudioButton } from '@studio/components';
import { SidebarLeftIcon, PlusIcon } from '@studio/icons';
import classes from './ThreadColumnCollapsed.module.css';

export type ThreadColumnHiddenProps = {
  onToggleCollapse: () => void;
};

export function ThreadColumnCollapsed({
  onToggleCollapse,
}: ThreadColumnHiddenProps): React.ReactElement {
  return (
    <div className={classes.threadColumnCollapsed}>
      <div className={classes.buttons}>
        <StudioButton variant='secondary' onClick={onToggleCollapse}>
          <SidebarLeftIcon />
        </StudioButton>
        <StudioButton>
          <PlusIcon />
        </StudioButton>
      </div>
    </div>
  );
}

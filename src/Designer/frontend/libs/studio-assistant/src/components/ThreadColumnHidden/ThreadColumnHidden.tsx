import React from 'react';
import { StudioButton } from '@studio/components';
import { SidebarLeftIcon, PlusIcon } from '@studio/icons';
import classes from './ThreadColumnHidden.module.css';

export type ThreadColumnHiddenProps = {
  onToggle: () => void;
};

export function ThreadColumnCollapsed({ onToggle }: ThreadColumnHiddenProps): React.ReactElement {
  return (
    <div className={classes.threadColumnHidden}>
      <div className={classes.buttons}>
        <StudioButton variant='secondary' onClick={onToggle}>
          <SidebarLeftIcon />
        </StudioButton>
        <StudioButton>
          <PlusIcon />
        </StudioButton>
      </div>
    </div>
  );
}

import React from 'react';
import classes from './AltinnHeaderbuttons.module.css';
import { AltinnButtonActionItem } from '../altinnHeader/types';
import { AltinnHeaderButton } from './AltinnHeaderButton';

export interface AltinnHeaderButtonsProps {
  actions: AltinnButtonActionItem[];
}

export const AltinnHeaderButtons = ({ actions }: AltinnHeaderButtonsProps) => {
  if (!actions?.length) return null;

  return (
    <div className={classes.rightContent} data-testid='altinn-header-buttons'>
      <div className={classes.rightContentButtons}>
        {actions.map((action) => (
          <AltinnHeaderButton key={action.menuKey} action={action} />
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import classes from './AltinnHeaderbuttons.module.css';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from '../altinnHeader/types';

export interface AltinnHeaderButtonsProps {
  actions: AltinnButtonActionItem[];
}

export const AltinnHeaderButtons = ({ actions }: AltinnHeaderButtonsProps) => {
  const { t } = useTranslation();

  if (!actions?.length) return null;

  return (
    <div className={classes.rightContent} data-testid='altinn-header-buttons'>
      <div className={classes.rightContentButtons}>
        {actions.map((action) => (
          <Button
            className={action.headerButtonsClasses}
            key={action.menuKey}
            onClick={action.handleClick}
            variant={action.buttonVariant}
            data-testid={action.menuKey}
          >
            {t(action.title)}
          </Button>
        ))}
      </div>
    </div>
  );
};

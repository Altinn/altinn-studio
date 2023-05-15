import React from 'react';
import classes from './AltinnHeaderbuttons.module.css';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AltinnButtonActionItem } from '../altinnHeader/types';

export interface AltinnHeaderButtonsProps {
  actions: AltinnButtonActionItem[];
}

export const AltinnHeaderButtons = ({ actions }: AltinnHeaderButtonsProps) => {
  const { t } = useTranslation();
  const { org, app } = useParams();

  const handleClick = (action: { menuKey?: any; title?: any; path?: any; buttonVariant: any }) => {
    window.location.href = action.path(org, app);
  };

  if (!actions?.length) return null;

  return (
    <div className={classes.rightContent} data-testid='altinn-header-buttons'>
      <div className={classes.rightContentButtons}>
        {actions.map(
          (
            action: {
              menuKey?: any;
              title?: any;
              path?: any;
              buttonVariant: any;
              headerButtonsClasses: any;
            },
            index: React.Key
          ) => (
            <Button
              className={action.headerButtonsClasses}
              key={index}
              onClick={() => handleClick(action)}
              variant={action.buttonVariant}
              data-testid={action.menuKey}
            >
              {t(action.title)}
            </Button>
          )
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from '../altinnHeader/types';

export interface AltinnHeaderButtonProps {
  action: AltinnButtonActionItem;
}

export const AltinnHeaderButton = ({ action }: AltinnHeaderButtonProps) => {
  const { t } = useTranslation();

  if (!action) return null;

  return (
    <Button
      className={action.headerButtonsClasses}
      key={action.menuKey}
      onClick={action.handleClick}
      variant={action.buttonVariant}
      color={action.buttonColor || 'first'}
      data-testid={action.menuKey}
      aria-label={t(action.title)}
      size='small'
    >
      {t(action.title)}
    </Button>
  );
};

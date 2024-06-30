import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AltinnButtonActionItem } from '../altinnHeader/types';
import { StudioButton } from '@studio/components';
import cn from 'classnames';

import classes from './AltinnHeaderButton.module.css';

export interface AltinnHeaderButtonProps {
  action: AltinnButtonActionItem;
}

export const AltinnHeaderButton = ({ action }: AltinnHeaderButtonProps) => {
  const { t } = useTranslation();

  if (!action) return null;

  return (
    <StudioButton
      asChild
      key={action.menuKey}
      data-testid={action.menuKey}
      aria-label={t(action.menuKey)}
      color={action.isInverted ? 'inverted' : 'first'}
      variant='secondary'
      // variant='secondary'
      size='small'
    >
      <a href={action.to} className={cn({ [classes.inverted]: action.isInverted })}>
        {t(action.menuKey)}
      </a>
    </StudioButton>
  );
};

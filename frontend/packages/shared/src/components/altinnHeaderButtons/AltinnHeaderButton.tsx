import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import classes from './AltinnHeaderButton.module.css';
import type { AltinnButtonActionItem } from '../altinnHeader/types';

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
    >
      <a href={action.to} className={cn({ [classes.inverted]: action.isInverted })}>
        {t(action.menuKey)}
      </a>
    </StudioButton>
  );
};

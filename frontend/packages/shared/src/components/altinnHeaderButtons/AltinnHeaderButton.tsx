import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AltinnButtonActionItem } from '../altinnHeader/types';
import { StudioButton } from '@studio/components';

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
      size='small'
    >
      <a href={action.to}>{t(action.menuKey)}</a>
    </StudioButton>
  );
};

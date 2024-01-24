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
      as='a'
      href={action.to}
      key={action.menuKey}
      data-testid={action.menuKey}
      aria-label={t(action.title)}
      color={action.isInverted ? 'inverted' : 'first'}
      variant='secondary'
      size='small'
    >
      {t(action.title)}
    </StudioButton>
  );
};

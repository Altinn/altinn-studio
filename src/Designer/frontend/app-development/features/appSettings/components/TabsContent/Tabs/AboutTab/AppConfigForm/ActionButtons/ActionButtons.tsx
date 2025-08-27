import React from 'react';
import type { ReactElement } from 'react';
import classes from './ActionButtons.module.css';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CheckmarkIcon, XMarkIcon } from 'libs/studio-icons/src';

export type ActionButtonsProps = {
  onSave: () => void;
  onReset: () => void;
  areButtonsDisabled: boolean;
};

export function ActionButtons({
  onSave,
  onReset,
  areButtonsDisabled,
}: ActionButtonsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={classes.actionButtons}>
      <StudioButton
        variant='primary'
        onClick={onSave}
        disabled={areButtonsDisabled}
        icon={<CheckmarkIcon />}
      >
        {t('app_settings.about_tab_save_button')}
      </StudioButton>
      <StudioButton
        variant='secondary'
        onClick={onReset}
        disabled={areButtonsDisabled}
        icon={<XMarkIcon />}
      >
        {t('app_settings.about_tab_reset_button')}
      </StudioButton>
    </div>
  );
}

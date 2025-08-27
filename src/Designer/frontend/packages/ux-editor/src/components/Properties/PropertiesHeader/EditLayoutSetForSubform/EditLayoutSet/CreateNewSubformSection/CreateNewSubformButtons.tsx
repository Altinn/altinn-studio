import React from 'react';
import classes from './CreateNewSubformButtons.module.css';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { StudioButton, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

type CreateNewSubformButtonsProps = {
  isPendingNewSubformMutation: boolean;
  disableSaveButton: boolean;
  displayCloseButton: boolean;
  handleCloseButton: () => void;
};

export const CreateNewSubformButtons = ({
  isPendingNewSubformMutation,
  disableSaveButton,
  displayCloseButton,
  handleCloseButton,
}: CreateNewSubformButtonsProps) => {
  const { t } = useTranslation();

  const saveIcon = isPendingNewSubformMutation ? (
    <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />
  ) : (
    <CheckmarkIcon />
  );

  return (
    <div className={classes.buttonGroup}>
      <StudioButton
        icon={saveIcon}
        type='submit'
        disabled={disableSaveButton}
        variant='primary'
        color='success'
      >
        {t('ux_editor.component_properties.subform.create_save_button')}
      </StudioButton>
      {displayCloseButton && (
        <StudioButton
          onClick={handleCloseButton}
          icon={<XMarkIcon />}
          variant='secondary'
          color='danger'
        >
          {t('ux_editor.component_properties.subform.create_cancel_button')}
        </StudioButton>
      )}
    </div>
  );
};

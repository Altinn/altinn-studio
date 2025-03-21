import React from 'react';
import classes from './CreateNewSubformButtons.module.css';
import { CheckmarkIcon, TrashIcon } from '@studio/icons';
import { StudioButton, StudioSpinner } from '@studio/components-legacy';
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
    <StudioSpinner size='sm' spinnerTitle={t('general.loading')} />
  ) : (
    <CheckmarkIcon />
  );

  return (
    <div className={classes.buttonGroup}>
      <StudioButton
        icon={saveIcon}
        type='submit'
        title={t('general.save')}
        disabled={disableSaveButton}
        variant='secondary'
        color='success'
      />
      {displayCloseButton && (
        <StudioButton
          onClick={handleCloseButton}
          title={t('general.close')}
          icon={<TrashIcon />}
          variant='secondary'
          color='danger'
        />
      )}
    </div>
  );
};

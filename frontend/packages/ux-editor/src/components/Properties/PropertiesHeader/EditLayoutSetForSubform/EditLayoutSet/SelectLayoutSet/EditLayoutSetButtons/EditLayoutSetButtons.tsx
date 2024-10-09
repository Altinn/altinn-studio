import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import classes from './EditLayoutSetButtons.module.css';

export type EditLayoutSetButtonsProps = {
  onClose: () => void;
  onDelete: () => void;
};

export const EditLayoutSetButtons = ({
  onClose,
  onDelete,
}: EditLayoutSetButtonsProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={classes.buttons}>
      <StudioButton
        icon={<CheckmarkIcon />}
        onClick={onClose}
        title={t('general.close')}
        variant='secondary'
      />
      <StudioDeleteButton onDelete={onDelete} size='small' title={t('general.delete')} />
    </div>
  );
};

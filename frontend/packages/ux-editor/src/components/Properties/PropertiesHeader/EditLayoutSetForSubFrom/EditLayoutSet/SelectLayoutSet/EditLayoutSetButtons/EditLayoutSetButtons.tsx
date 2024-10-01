import React from 'react';
import classes from './EditLayoutSetButtons.module.css';

import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { XMarkIcon } from '@studio/icons';

type EditLayoutSetButtonsProps = {
  onClose: () => void;
  onDelete: () => void;
};

export const EditLayoutSetButtons = ({ onClose, onDelete }: EditLayoutSetButtonsProps) => {
  const { t } = useTranslation();

  return (
    <div className={classes.buttons}>
      <StudioButton
        icon={<XMarkIcon />}
        onClick={onClose}
        title={t('general.close')}
        variant='secondary'
      />
      <StudioDeleteButton onDelete={onDelete} size='small' title={t('general.delete')} />
    </div>
  );
};

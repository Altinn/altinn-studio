import React from 'react';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import classes from './EditBindingButtons.module.css';
import { useTranslation } from 'react-i18next';
import type { ExplicitDataModelBinding } from '@altinn/ux-editor/types/global';

export type EditBindingButtons = {
  handleBindingChange: (binding: ExplicitDataModelBinding) => void;
  onSetDataModelSelectVisible: (visible: boolean) => void;
};

export const EditBindingButtons = ({
  handleBindingChange,
  onSetDataModelSelectVisible,
}: EditBindingButtons) => {
  const { t } = useTranslation();

  const handleDelete = () => {
    handleBindingChange(undefined);
    onSetDataModelSelectVisible(false);
  };

  return (
    <div className={classes.buttons}>
      <StudioButton
        icon={<XMarkIcon />}
        onClick={() => onSetDataModelSelectVisible(false)}
        variant='secondary'
      >
        {t('right_menu.data_model_bindings_save_button')}
      </StudioButton>
      <StudioDeleteButton
        confirmMessage={t('right_menu.data_model_bindings_delete_confirm')}
        onDelete={handleDelete}
      >
        {t('right_menu.data_model_bindings_delete_button')}
      </StudioDeleteButton>
    </div>
  );
};

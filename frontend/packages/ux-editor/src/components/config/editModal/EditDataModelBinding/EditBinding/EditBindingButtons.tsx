import React from 'react';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import classes from './EditBinding.module.css';
import { useTranslation } from 'react-i18next';

export type EditBindingButtons = {
  handleBindingChange: (binding: { property: string; dataType: string }) => void;
  setDataModelSelectVisible: (visible: boolean) => void;
};

export const EditBindingButtons = ({
  handleBindingChange,
  setDataModelSelectVisible,
}: EditBindingButtons) => {
  const { t } = useTranslation();

  const handleDelete = () => {
    const updatedDataModelBinding = {
      property: '',
      dataType: undefined,
    };
    handleBindingChange(updatedDataModelBinding);
    setDataModelSelectVisible(false);
  };

  return (
    <div className={classes.buttons}>
      <StudioButton
        icon={<XMarkIcon />}
        onClick={() => setDataModelSelectVisible(false)}
        size='small'
        title={t('general.close')}
        variant='secondary'
      />
      <StudioDeleteButton
        confirmMessage={t('right_menu.data_model_bindings_delete_confirm')}
        onDelete={handleDelete}
        size='small'
        title={t('general.delete')}
      />
    </div>
  );
};

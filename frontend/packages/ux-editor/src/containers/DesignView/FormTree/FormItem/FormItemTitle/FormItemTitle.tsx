import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import classes from './FormItemTitle.module.css';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { useDeleteItem } from './useDeleteItem';

export interface FormItemTitleProps {
  children: ReactNode;
  formItem: FormComponent | FormContainer;
}

export const FormItemTitle = ({ children, formItem }: FormItemTitleProps) => {
  const { t } = useTranslation();
  const deleteItem = useDeleteItem(formItem);

  const handleDelete = useCallback(() => {
    if (confirm(t('ux_editor.component_deletion_text'))) {
      deleteItem(formItem.id);
    }
  }, [formItem.id, deleteItem, t]);

  return (
    <div className={classes.root}>
      <div className={classes.label}>{children}</div>
      <StudioButton
        className={classes.deleteButton}
        color='danger'
        icon={<TrashIcon />}
        onClick={handleDelete}
        size='small'
        title={t('general.delete')}
        variant='tertiary'
      />
    </div>
  );
};

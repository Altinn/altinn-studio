import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import classes from './FormItemTitle.module.css';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { useDeleteItem } from './useDeleteItem';
import { isContainer } from '../../../../../utils/formItemUtils';
import { useFormItemContext } from '../../../../FormItemContext';
import { useAppContext } from '../../../../../hooks';
import classNames from 'classnames';

export interface FormItemTitleProps {
  children: ReactNode;
  formItem: FormComponent | FormContainer;
  duplicateComponents?: string[];
}

export const FormItemTitle = ({ children, formItem, duplicateComponents }: FormItemTitleProps) => {
  const { t } = useTranslation();
  const deleteItem = useDeleteItem(formItem);
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();
  const { handleDiscard } = useFormItemContext();

  const handleDelete = useCallback(() => {
    const confirmMessage = isContainer(formItem)
      ? t('ux_editor.component_group_deletion_text')
      : t('ux_editor.component_deletion_text');

    if (confirm(confirmMessage)) {
      deleteItem(formItem.id, {
        onSuccess: async () => {
          await refetchLayouts(selectedFormLayoutSetName, true);
          handleDiscard();
        },
      });
    }
  }, [formItem, t, deleteItem, refetchLayouts, selectedFormLayoutSetName, handleDiscard]);

  return (
    <div
      className={classNames(classes.root, {
        [classes.duplicateComponentIds]: duplicateComponents?.includes(formItem.id),
      })}
    >
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

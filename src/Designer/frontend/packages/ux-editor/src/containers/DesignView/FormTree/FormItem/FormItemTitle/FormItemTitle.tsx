import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import { StudioButton } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from 'libs/studio-icons/src';
import classes from './FormItemTitle.module.css';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { useDeleteItem } from './useDeleteItem';
import { isContainer } from '../../../../../utils/formItemUtils';
import { useFormItemContext } from '../../../../FormItemContext';
import { useAppContext } from '../../../../../hooks';
import classNames from 'classnames';
import { isComponentDeprecated } from '@altinn/ux-editor/utils/component';

export interface FormItemTitleProps {
  children: ReactNode;
  formItem: FormComponent | FormContainer;
  duplicateComponents?: string[];
}

export const FormItemTitle = ({ children, formItem, duplicateComponents }: FormItemTitleProps) => {
  const { t } = useTranslation();
  const deleteItem = useDeleteItem(formItem);
  const { selectedFormLayoutSetName, updateLayoutsForPreview } = useAppContext();
  const { handleDiscard } = useFormItemContext();

  const handleDelete = useCallback(() => {
    const confirmMessage = isContainer(formItem)
      ? t('ux_editor.component_group_deletion_text')
      : t('ux_editor.component_deletion_text');

    if (confirm(confirmMessage)) {
      deleteItem(formItem.id, {
        onSuccess: async () => {
          await updateLayoutsForPreview(selectedFormLayoutSetName, true);
          handleDiscard();
        },
      });
    }
  }, [formItem, t, deleteItem, updateLayoutsForPreview, selectedFormLayoutSetName, handleDiscard]);

  return (
    <div
      className={classNames(classes.root, {
        [classes.duplicateComponentIds]: duplicateComponents?.includes(formItem.id),
        [classes.deprecatedComponent]: isComponentDeprecated(formItem.type),
      })}
    >
      <div className={classes.label}>{children}</div>
      <StudioButton
        className={classes.deleteButton}
        color='danger'
        icon={<TrashIcon />}
        onClick={handleDelete}
        title={t('general.delete')}
        variant='tertiary'
      />
    </div>
  );
};

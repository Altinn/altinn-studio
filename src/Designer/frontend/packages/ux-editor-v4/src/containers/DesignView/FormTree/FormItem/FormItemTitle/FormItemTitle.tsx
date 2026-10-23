import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import classes from './FormItemTitle.module.css';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { useDeleteItem } from './useDeleteItem';
import { isContainer } from '../../../../../utils/formItemUtils';
import { getAllDescendants } from '../../../../../utils/formLayoutUtils';
import { useFormItemContext } from '../../../../FormItemContext';
import { useAppContext, useSelectedFormLayout } from '../../../../../hooks';
import classNames from 'classnames';
import { isComponentDeprecated } from '@altinn/ux-editor-v4/utils/component';
import useUxEditorParams from '@altinn/ux-editor-v4/hooks/useUxEditorParams';

export interface FormItemTitleProps {
  children: ReactNode;
  formItem: FormComponent | FormContainer;
  duplicateComponents?: string[];
}

export const FormItemTitle = ({ children, formItem, duplicateComponents }: FormItemTitleProps) => {
  const { t } = useTranslation();
  const deleteItem = useDeleteItem(formItem);
  const { updateLayoutsForPreview } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const layout = useSelectedFormLayout();
  const { formItemId: selectedItemId, handleDiscard } = useFormItemContext();

  const handleDelete = useCallback(() => {
    const confirmMessage = isContainer(formItem)
      ? t('ux_editor.component_group_deletion_text')
      : t('ux_editor.component_deletion_text');

    if (confirm(confirmMessage)) {
      const deletedItemIds = [formItem.id, ...getAllDescendants(layout, formItem.id)];
      deleteItem(formItem.id, {
        onSuccess: async () => {
          await updateLayoutsForPreview(layoutSet, true);
          if (deletedItemIds.includes(selectedItemId)) handleDiscard();
        },
      });
    }
  }, [
    formItem,
    t,
    deleteItem,
    layout,
    updateLayoutsForPreview,
    layoutSet,
    selectedItemId,
    handleDiscard,
  ]);

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
        icon={<TrashIcon />}
        onClick={handleDelete}
        title={t('general.delete')}
        variant='tertiary'
      />
    </div>
  );
};

import React from 'react';
import type { IInternalLayout } from '../../../types/global';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderItemList } from './renderItemList';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormItemContext } from '../../FormItemContext';
import { getItem } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';

export type FormTreeProps = {
  layout: IInternalLayout;
  duplicateComponents?: string[];
};

export const FormTree = ({ layout, duplicateComponents }: FormTreeProps) => {
  const { setFormItemId, setFormItem, formItemId: formId } = useFormItemContext();
  const { t } = useTranslation();

  const handleSelect = async (id: string) => {
    // TODO: only used formItem
    setFormItemId(id);
    setFormItem(getItem(layout, id));
  };

  return (
    <DragAndDropTree.Root
      onSelect={handleSelect}
      emptyMessage={t('ux_editor.container_empty')}
      selectedId={formId}
    >
      {renderItemList(layout, duplicateComponents, BASE_CONTAINER_ID)}
    </DragAndDropTree.Root>
  );
};

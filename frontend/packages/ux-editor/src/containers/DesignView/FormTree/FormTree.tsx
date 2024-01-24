import React from 'react';
import type { IInternalLayout } from '../../../types/global';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderItemList } from './renderItemList';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormContext } from '../../FormContext';
import { getItem } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';

export type FormTreeProps = {
  layout: IInternalLayout;
};

export const FormTree = ({ layout }: FormTreeProps) => {
  const { handleEdit, formId } = useFormContext();
  const { t } = useTranslation();

  const handleSelect = async (id: string) => handleEdit(getItem(layout, id));

  return (
    <DragAndDropTree.Root
      onSelect={handleSelect}
      emptyMessage={t('ux_editor.container_empty')}
      selectedId={formId}
    >
      {renderItemList(layout, BASE_CONTAINER_ID)}
    </DragAndDropTree.Root>
  );
};

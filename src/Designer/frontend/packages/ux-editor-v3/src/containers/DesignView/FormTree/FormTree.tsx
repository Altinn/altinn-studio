import React from 'react';
import type { IInternalLayout } from '../../../types/global';
import { StudioDragAndDropTree } from 'libs/studio-components-legacy/src';
import { renderItemList } from './renderItemList';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormItemContext } from '../../FormItemContext';
import { getItem } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';

export type FormTreeProps = {
  layout: IInternalLayout;
};

export const FormTree = ({ layout }: FormTreeProps) => {
  const { handleEdit, formItemId: formId } = useFormItemContext();
  const { t } = useTranslation();

  const handleSelect = async (id: string) => handleEdit(getItem(layout, id));

  return (
    <StudioDragAndDropTree.Root
      onSelect={handleSelect}
      emptyMessage={t('ux_editor.container_empty')}
      selectedId={formId}
    >
      {renderItemList(layout, BASE_CONTAINER_ID)}
    </StudioDragAndDropTree.Root>
  );
};

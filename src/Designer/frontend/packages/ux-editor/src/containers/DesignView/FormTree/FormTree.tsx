import React from 'react';
import type { IInternalLayout } from '../../../types/global';
import { StudioDragAndDropTree } from '@studio/components-legacy';
import { renderItemList } from './renderItemList';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormItemContext } from '../../FormItemContext';
import { getItem } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../hooks';
import { ItemType } from '../../../components/Properties/ItemType';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

export type FormTreeProps = {
  layout: IInternalLayout;
  duplicateComponents?: string[];
};

export const FormTree = ({ layout, duplicateComponents }: FormTreeProps) => {
  const { handleEdit, formItemId: formId } = useFormItemContext();
  const { setSelectedItem } = useAppContext();
  const { t } = useTranslation();
  const isAddComponentModalEnabled = useFeatureFlag(FeatureFlag.AddComponentModal);

  const handleSelect = async (id: string) => {
    handleEdit(getItem(layout, id));
    setSelectedItem({
      type: ItemType.Component,
      id: id,
    });
  };

  return (
    <StudioDragAndDropTree.Root
      onSelect={handleSelect}
      emptyMessage={t('ux_editor.container_empty')}
      selectedId={formId}
    >
      {renderItemList(layout, duplicateComponents, BASE_CONTAINER_ID, isAddComponentModalEnabled)}
    </StudioDragAndDropTree.Root>
  );
};

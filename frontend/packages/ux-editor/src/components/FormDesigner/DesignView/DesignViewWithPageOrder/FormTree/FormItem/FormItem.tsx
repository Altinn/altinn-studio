import React from 'react';
import type { IInternalLayout } from '../../../../../../types/global';
import { getItem, isContainer } from '../../../../../../utils/formLayoutUtils';
import { renderItemList, renderItemListWithAddItemButton } from '../renderItemList';
import { StudioDragAndDropTree } from '@studio/components-legacy';
import { FormItemTitle } from './FormItemTitle';
import { formItemConfigs } from '../../../../../../data/formItemConfig';
import { useTranslation } from 'react-i18next';
import { UnknownReferencedItem } from '../UnknownReferencedItem';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { useComponentTitle } from '@altinn/ux-editor/hooks';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';

export type FormItemProps = {
  layout: IInternalLayout;
  id: string;
  duplicateComponents?: string[];
};

export const FormItem = ({ layout, id, duplicateComponents }: FormItemProps) => {
  const { t } = useTranslation();
  const componentTitle = useComponentTitle();
  const formItem = getItem(layout, id);

  if (!formItem) {
    return <UnknownReferencedItem id={id} layout={layout} />;
  }

  const isUnknownInternalComponent: boolean = !formItemConfigs[formItem.type];

  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[formItem.type]?.icon;

  const labelWrapper = (label: string) => (
    <FormItemTitle duplicateComponents={duplicateComponents} formItem={formItem}>
      {label}
    </FormItemTitle>
  );

  const shouldDisplayAddButton =
    isContainer(layout, id) && shouldDisplayFeature(FeatureFlag.AddComponentModal);

  return (
    <StudioDragAndDropTree.Item
      icon={Icon && <Icon />}
      emptyMessage={t('ux_editor.container_empty')}
      expandable={isContainer(layout, id)}
      label={componentTitle(formItem)}
      labelWrapper={labelWrapper}
      nodeId={id}
    >
      {shouldDisplayAddButton
        ? renderItemListWithAddItemButton(layout, duplicateComponents, id)
        : renderItemList(layout, duplicateComponents, id)}
    </StudioDragAndDropTree.Item>
  );
};

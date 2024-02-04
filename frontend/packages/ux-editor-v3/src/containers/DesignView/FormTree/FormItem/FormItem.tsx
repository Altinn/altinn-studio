import React from 'react';
import type { IInternalLayout } from '../../../../types/global';
import { getItem, isContainer } from '../../../../utils/formLayoutUtils';
import { renderItemList } from '../renderItemList';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { FormItemTitle } from './FormItemTitle';
import { formItemConfigs } from '../../../../data/formItemConfig';
import { useItemTitle } from './useItemTitle';
import { useTranslation } from 'react-i18next';
import { UnknownReferencedItem } from '../UnknownReferencedItem';
import { QuestionmarkDiamondIcon } from '@studio/icons';

export type FormItemProps = {
  layout: IInternalLayout;
  id: string;
};

export const FormItem = ({ layout, id }: FormItemProps) => {
  const itemTitle = useItemTitle();
  const { t } = useTranslation();

  const formItem = getItem(layout, id);

  if (!formItem) {
    return <UnknownReferencedItem id={id} layout={layout} />;
  }

  const isUnknownInternalComponent: boolean = !formItemConfigs[formItem.type];

  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[formItem.type]?.icon;

  const labelWrapper = (label: string) => (
    <FormItemTitle formItem={formItem}>{label}</FormItemTitle>
  );

  return (
    <DragAndDropTree.Item
      icon={Icon && <Icon />}
      emptyMessage={t('ux_editor.container_empty')}
      expandable={isContainer(layout, id)}
      label={itemTitle(formItem)}
      labelWrapper={labelWrapper}
      nodeId={id}
    >
      {renderItemList(layout, id)}
    </DragAndDropTree.Item>
  );
};

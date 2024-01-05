import React from 'react';
import { IInternalLayout } from '../../../../types/global';
import { getItem, isContainer } from '../../../../utils/formLayoutUtils';
import { renderItemList } from '../renderItemList';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { FormItemTitle } from './FormItemTitle';
import { formItemConfigs } from '../../../../data/formItemConfig';
import { useItemTitle } from './useItemTitle';
import { useTranslation } from 'react-i18next';
import { QuestionmarkDiamondIcon } from '@studio/icons';

export type FormItemProps = {
  layout: IInternalLayout;
  id: string;
};

export const FormItem = ({ layout, id }: FormItemProps) => {
  const itemTitle = useItemTitle();
  const { t } = useTranslation();

  const item = getItem(layout, id);
  const isUnknownInternalComponent: boolean = !formItemConfigs[item.type];

  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[item.type]?.icon;
  const labelWrapper = (label: string) => <FormItemTitle formItem={item}>{label}</FormItemTitle>;

  return (
    <DragAndDropTree.Item
      icon={Icon && <Icon />}
      emptyMessage={t('ux_editor.container_empty')}
      expandable={isContainer(layout, id)}
      label={itemTitle(item)}
      labelWrapper={labelWrapper}
      nodeId={id}
    >
      {renderItemList(layout, id)}
    </DragAndDropTree.Item>
  );
};

import React from 'react';
import { IInternalLayout } from '../../../../types/global';
import { getChildIds, getItem, isContainer } from '../../../../utils/formLayoutUtils';
import { FormItemList } from '../FormItemList';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { FormItemTitle } from './FormItemTitle';
import { formItemConfigs } from '../../../../data/formItemConfig';
import { EmptyGroupContent } from './EmptyGroupContent';
import { useItemTitle } from './useItemTitle';

export type FormItemProps = {
  layout: IInternalLayout;
  id: string;
};

export const FormItem = ({ layout, id }: FormItemProps) => {
  const itemTitle = useItemTitle();

  const item = getItem(layout, id);
  const Icon = formItemConfigs[item.type]?.icon;
  const labelWrapper = (label: string) => <FormItemTitle formItem={item}>{label}</FormItemTitle>;

  return (
    <DragAndDropTree.Item
      icon={Icon && <Icon />}
      label={itemTitle(item)}
      labelWrapper={labelWrapper}
      nodeId={id}
    >
      {renderChildren(layout, id)}
    </DragAndDropTree.Item>
  );
};

const renderChildren = (layout: IInternalLayout, id: string) => {
  if (!isContainer(layout, id)) return;
  const childIds = getChildIds(layout, id);
  if (!childIds.length) return <EmptyGroupContent />;
  else return <FormItemList layout={layout} parentId={id} />;
};

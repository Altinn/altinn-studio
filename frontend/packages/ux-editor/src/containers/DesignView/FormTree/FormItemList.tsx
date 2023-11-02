import React from 'react';
import { getChildIds } from '../../../utils/formLayoutUtils';
import { FormItem } from './FormItem';
import { IInternalLayout } from '../../../types/global';

export interface FormItemListProps {
  layout: IInternalLayout;
  parentId: string;
}

export const FormItemList = ({ layout, parentId }: FormItemListProps) => (
  <>
    {getChildIds(layout, parentId).map((id) => (
      <FormItem layout={layout} id={id} key={id} />
    ))}
  </>
);

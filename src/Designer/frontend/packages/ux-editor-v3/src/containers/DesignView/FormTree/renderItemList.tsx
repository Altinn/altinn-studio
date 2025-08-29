import React from 'react';
import { getChildIds } from '../../../utils/formLayoutUtils';
import { FormItem } from './FormItem';
import type { IInternalLayout } from '../../../types/global';

export const renderItemList = (layout: IInternalLayout, parentId: string) => {
  const childIds = getChildIds(layout, parentId);
  return childIds.length ? (
    <>
      {childIds.map((id) => (
        <FormItem layout={layout} id={id} key={id} />
      ))}
    </>
  ) : null;
};

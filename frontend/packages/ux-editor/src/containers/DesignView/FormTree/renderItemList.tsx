import React, { type ReactElement } from 'react';
import { getChildIds } from '../../../utils/formLayoutUtils';
import { FormItem } from './FormItem';
import type { IInternalLayout } from '../../../types/global';
import { AddItem } from '../AddItem';

export const renderItemList = (
  layout: IInternalLayout,
  duplicateComponents: string[],
  parentId: string,
): ReactElement => {
  const childIds: string[] = getChildIds(layout, parentId);
  return childIds.length ? (
    <>
      {childIds.map((id: string, index: number) => (
        <FormItem
          duplicateComponents={duplicateComponents}
          layout={layout}
          id={id}
          key={id}
          containerId={parentId}
          saveAtIndexPosition={getSavePositionByIndex(index)}
        />
      ))}
    </>
  ) : null;
};

export const renderItemListWithAddItemButton = (
  layout: IInternalLayout,
  duplicateComponents: string[],
  parentId: string,
) => {
  const childIds: string[] = getChildIds(layout, parentId);
  return (
    <>
      {childIds.map((id: string, index: number) => (
        <FormItem
          duplicateComponents={duplicateComponents}
          layout={layout}
          id={id}
          key={id}
          containerId={parentId}
          saveAtIndexPosition={getSavePositionByIndex(index)}
        />
      ))}
      <AddItem containerId={parentId} layout={layout} />
    </>
  );
};

function getSavePositionByIndex(index: number): number {
  const positionOffset = 1;
  return index + positionOffset;
}

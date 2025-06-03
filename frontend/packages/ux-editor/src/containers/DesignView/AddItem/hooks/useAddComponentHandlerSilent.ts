import type { IInternalLayout } from '@altinn/ux-editor/types/global';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { useBaseAddComponentHandler } from './useBaseAddComponentHandler';

export const useAddComponentHandlerSilent = (layout: IInternalLayout) => {
  const { addItem: baseAddItem } = useBaseAddComponentHandler(layout);

  const addItem = (
    type: ComponentType | CustomComponentType,
    parentId: string,
    index: number,
    newId: string,
  ) => {
    baseAddItem(type, parentId, index, newId, () => {});
  };

  return { addItem };
};

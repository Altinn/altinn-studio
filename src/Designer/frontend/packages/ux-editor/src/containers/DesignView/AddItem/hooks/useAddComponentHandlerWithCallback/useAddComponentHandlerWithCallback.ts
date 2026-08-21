import type { IInternalLayout } from '../../../../../types/global';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { useBaseAddComponentHandler } from '../useBaseAddComponentHandler/useBaseAddComponentHandler';

export const useAddComponentHandlerWithCallback = (layout: IInternalLayout, onDone: () => void) => {
  const { addItem: baseAddItem } = useBaseAddComponentHandler(layout);

  const addItem = (
    type: ComponentType | ComponentPreset,
    parentId: string,
    index: number,
    newId: string,
  ) => {
    baseAddItem(type, parentId, index, newId, onDone);
  };

  return { addItem };
};

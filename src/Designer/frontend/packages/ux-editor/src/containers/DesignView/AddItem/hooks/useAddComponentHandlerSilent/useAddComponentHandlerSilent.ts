import type { IInternalLayout } from '../../../../../types/global';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { useBaseAddComponentHandler } from '../useBaseAddComponentHandler/useBaseAddComponentHandler';

export const useAddComponentHandlerSilent = (layout: IInternalLayout) => {
  const { addItem: baseAddItem } = useBaseAddComponentHandler(layout);

  const addItem = (
    type: ComponentType | ComponentPreset,
    parentId: string,
    index: number,
    newId: string,
  ) => {
    baseAddItem(type, parentId, index, newId, () => {});
  };

  return { addItem };
};

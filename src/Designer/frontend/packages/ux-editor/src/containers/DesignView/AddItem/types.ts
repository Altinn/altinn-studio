import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';

export type AddedItem = {
  componentType: ComponentType | ComponentPreset;
  componentId: string;
};

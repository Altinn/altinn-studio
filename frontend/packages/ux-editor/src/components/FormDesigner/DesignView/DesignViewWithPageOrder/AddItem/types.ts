import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';

export type AddedItem = {
  componentType: ComponentType | CustomComponentType;
  componentId: string;
};

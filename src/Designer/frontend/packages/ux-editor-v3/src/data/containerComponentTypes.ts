import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { formItemConfigs } from './formItemConfig';
import { LayoutItemType } from '../types/global';

export const containerComponentTypes: ComponentTypeV3[] = Object.values(formItemConfigs)
  .filter((comp) => comp.itemType === LayoutItemType.Container)
  .map((comp) => comp.name);

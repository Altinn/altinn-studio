import type { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs } from './formItemConfig';
import { LayoutItemType } from '../types/global';

export const containerComponentTypes: ComponentType[] = Object.values(formItemConfigs)
  .filter((comp) => comp.itemType === LayoutItemType.Container)
  .map((comp) => comp.name);

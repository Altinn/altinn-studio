import type { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs } from './formItemConfig';

export const containerComponentTypes: ComponentType[] = Object.values(formItemConfigs)
  .filter((comp) => comp.defaultProperties.itemType === 'CONTAINER')
  .map((comp) => comp.defaultProperties.type);

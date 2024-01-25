import type { IFormLayouts } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { ComponentType } from 'app-shared/types/ComponentType';

export const generateTextResourceId = (
  layoutName: string,
  componentId: string,
  textKey: string,
) => {
  return `${layoutName}.${componentId}.${textKey}`;
};

export const generateComponentId = (componentType: ComponentType, layouts: IFormLayouts) => {
  const layoutNames = Object.keys(layouts);
  let existsInLayout = true;
  let componentId = '';

  // ensure generated ID is unique within the provided layouts
  while (existsInLayout) {
    componentId = `${componentType}-${generateRandomId(6)}`;
    layoutNames.forEach((layoutName) => {
      const layout = layouts[layoutName];
      if (componentType === ComponentType.Group) {
        existsInLayout = !!layout.containers[componentId];
      } else if (layout.components) {
        existsInLayout = !!layout.components[componentId];
      }
    });
  }

  return componentId;
};

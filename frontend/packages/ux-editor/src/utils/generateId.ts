import { IFormLayouts } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { ComponentTypes } from '../components';

export const generateTextResourceId = (
  layoutName: string,
  componentId: string,
  textKey: string
) => {
  return `${layoutName}.${componentId}.${textKey}`;
};

export const generateComponentId = (componentType: string, layouts: IFormLayouts) => {
  const layoutNames = Object.keys(layouts);
  let existsInLayout = true;
  let componentId = '';

  // ensure generated ID is unique within the provided layouts
  while (existsInLayout) {
    componentId = `${componentType}-${generateRandomId(6)}`;
    layoutNames.forEach((layoutName) => {
      const layout = layouts[layoutName];
      if (componentType === ComponentTypes.Group) {
        existsInLayout = !!layout.containers[componentId];
      } else {
        existsInLayout = !!layout.components[componentId];
      }
    });
  }

  return componentId;
};

import { IFormLayouts } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';

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
      existsInLayout = !!layouts[layoutName].components[componentId];
    });
  }

  return componentId;
};

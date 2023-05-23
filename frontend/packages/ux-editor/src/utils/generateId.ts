import { IFormLayouts } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { FormItemType } from 'app-shared/types/FormItemType';

export const generateTextResourceId = (
  layoutName: string,
  componentId: string,
  textKey: string
) => {
  return `${layoutName}.${componentId}.${textKey}`;
};

export const generateComponentId = (componentType: FormItemType, layouts: IFormLayouts) => {
  const layoutNames = Object.keys(layouts);
  let existsInLayout = true;
  let componentId = '';

  // ensure generated ID is unique within the provided layouts
  while (existsInLayout) {
    componentId = `${componentType}-${generateRandomId(6)}`;
    layoutNames.forEach((layoutName) => {
      const layout = layouts[layoutName];
      if (componentType === FormItemType.Group) {
        existsInLayout = !!layout.containers[componentId];
      } else if (layout.components) {
        existsInLayout = !!layout.components[componentId];
      }
    });
  }

  return componentId;
};

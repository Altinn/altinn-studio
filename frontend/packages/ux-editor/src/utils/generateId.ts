import { IFormLayout } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';

export const generateTextResourceId = (
  layoutName: string,
  componentId: string,
  textKey: string
) => {
  return `${layoutName}-${componentId}-${textKey}`;
};

export const generateComponentId = (componentType: string, layout: IFormLayout) => {
  let existsInLayout = true;
  let componentId = '';

  // ensure generated ID is unique within the provided layout
  while (existsInLayout) {
    componentId = `${componentType}-${generateRandomId(6)}`;
    existsInLayout = !!layout.components[componentId];
  }
  return componentId;
};

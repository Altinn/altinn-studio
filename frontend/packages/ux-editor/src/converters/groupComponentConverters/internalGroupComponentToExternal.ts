import type { FormContainer } from '../../types/FormContainer';
import type { ExternalGroupComponent } from '../../types/ExternalGroupComponent';
import { ComponentType } from 'app-shared/types/ComponentType';

export const internalGroupComponentToExternal = (
  internalGroupComponent: FormContainer,
  children: string[],
): ExternalGroupComponent => {
  const propertiesToKeep = { ...internalGroupComponent };
  delete propertiesToKeep.itemType;
  delete propertiesToKeep.propertyPath;
  delete propertiesToKeep.pageIndex;
  return {
    ...propertiesToKeep,
    children,
    type: ComponentType.Group,
  };
};

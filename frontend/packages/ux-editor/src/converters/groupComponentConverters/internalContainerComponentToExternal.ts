import type { FormContainer } from '../../types/FormContainer';
import type { ExternalContainerComponent } from '../../types/ExternalContainerComponent';

export const internalContainerComponentToExternal = (
  internalGroupComponent: FormContainer,
  children: string[],
): ExternalContainerComponent => {
  const propertiesToKeep = { ...internalGroupComponent };
  delete propertiesToKeep.itemType;
  delete propertiesToKeep.propertyPath;
  delete propertiesToKeep.pageIndex;
  return {
    ...propertiesToKeep,
    children,
    type: internalGroupComponent.type,
  };
};

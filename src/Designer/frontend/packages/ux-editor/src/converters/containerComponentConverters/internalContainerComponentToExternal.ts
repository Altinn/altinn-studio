import type { FormContainer } from '../../types/FormContainer';
import type { ExternalContainerComponent } from '../../types/ExternalContainerComponent';

export const internalContainerComponentToExternal = (
  internalContainerComponent: FormContainer,
  children: string[],
): ExternalContainerComponent => {
  const propertiesToKeep = { ...internalContainerComponent };
  delete propertiesToKeep.itemType;
  delete propertiesToKeep.propertyPath;
  delete propertiesToKeep.pageIndex;
  return {
    ...propertiesToKeep,
    children,
    type: internalContainerComponent.type,
  } as ExternalContainerComponent;
};

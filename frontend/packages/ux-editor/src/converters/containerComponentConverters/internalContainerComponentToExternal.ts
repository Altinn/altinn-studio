import type { ExternalContainerComponent } from '../../types/ExternalContainerComponent';
import type { FormItem } from '../../types/FormItem';
import type { ContainerComponentType } from '../../types/ContainerComponent';

export const internalContainerComponentToExternal = (
  internalContainerComponent: FormItem,
  children: string[],
): ExternalContainerComponent => {
  const propertiesToKeep = { ...internalContainerComponent };
  delete propertiesToKeep.itemType;
  delete propertiesToKeep.propertyPath;
  delete propertiesToKeep.pageIndex;
  return {
    ...propertiesToKeep,
    children,
    type: internalContainerComponent.type as ContainerComponentType,
  } as any;
};

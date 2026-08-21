import type { FormContainer } from '../../types/FormContainer';
import type { SerializedContainerComponent } from '../../types/SerializedComponent';

export const internalContainerComponentToExternal = (
  internalContainerComponent: FormContainer,
  children: string[],
): SerializedContainerComponent => {
  const propertiesToKeep = { ...internalContainerComponent };
  return {
    ...propertiesToKeep,
    children,
    type: internalContainerComponent.type,
  } as SerializedContainerComponent;
};

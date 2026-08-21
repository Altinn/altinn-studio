import type { SerializedContainerComponent } from '../../types/SerializedComponent';
import type { FormContainer } from '../../types/FormContainer';

export const externalContainerComponentToInternal = (
  externalComponent: SerializedContainerComponent,
): FormContainer => {
  const propertiesToKeep = { ...externalComponent };
  delete propertiesToKeep.children;

  return {
    ...propertiesToKeep,
    type: externalComponent.type,
  } as unknown as FormContainer;
};

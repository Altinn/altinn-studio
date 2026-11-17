import type { SerializedContainerComponent } from '../../types/SerializedComponent';
import type { FormContainer } from '../../types/FormContainer';
import { separateComponentProperties } from '../componentProperties';

export const externalContainerComponentToInternal = (
  externalComponent: SerializedContainerComponent,
): FormContainer => {
  const { known: propertiesToKeep, custom } = separateComponentProperties(externalComponent);
  delete propertiesToKeep.children;

  return {
    ...propertiesToKeep,
    ...(Object.keys(custom).length ? { customProperties: custom } : {}),
    type: externalComponent.type,
  } as unknown as FormContainer;
};

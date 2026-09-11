import type { FormContainer } from '../../types/FormContainer';
import type { SerializedContainerComponent } from '../../types/SerializedComponent';
import { mergeComponentProperties } from '../componentProperties';

export const internalContainerComponentToExternal = (
  internalContainerComponent: FormContainer,
  children: string[],
): SerializedContainerComponent => {
  const { customProperties, ...component } = internalContainerComponent;
  return mergeComponentProperties(
    { ...component, children, type: internalContainerComponent.type },
    customProperties,
  ) as SerializedContainerComponent;
};

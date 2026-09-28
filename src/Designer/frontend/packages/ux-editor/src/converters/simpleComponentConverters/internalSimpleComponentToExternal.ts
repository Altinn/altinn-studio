import type { FormComponent } from '../../types/FormComponent';
import type { SerializedSimpleComponent } from '../../types/SerializedComponent';
import type { SimpleComponentType } from '../../types/SimpleComponentType';
import { mergeComponentProperties } from '../componentProperties';

export const internalSimpleComponentToExternal = <T extends SimpleComponentType>(
  internalComponent: FormComponent<T>,
): SerializedSimpleComponent<T> => {
  const { customProperties, ...component } = internalComponent;
  return mergeComponentProperties(
    component,
    customProperties,
  ) as unknown as SerializedSimpleComponent<T>;
};

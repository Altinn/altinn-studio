import type { FormComponent } from '../../types/FormComponent';
import type { SerializedSimpleComponent } from '../../types/SerializedComponent';
import type { SimpleComponentType } from '../../types/SimpleComponentType';

export const internalSimpleComponentToExternal = <T extends SimpleComponentType>(
  internalComponent: FormComponent<T>,
): SerializedSimpleComponent<T> => {
  const propertiesToKeep = { ...internalComponent };
  return propertiesToKeep as unknown as SerializedSimpleComponent<T>;
};

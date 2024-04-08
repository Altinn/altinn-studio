import type { FormComponent } from '../../types/FormComponent';
import type { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';
import type { SimpleComponentType } from '../../types/SimpleComponentType';

export const internalSimpleComponentToExternal = <T extends SimpleComponentType>(
  internalComponent: FormComponent<T>,
): ExternalSimpleComponent<T> => {
  const propertiesToKeep = { ...internalComponent };
  delete propertiesToKeep.itemType;
  delete propertiesToKeep.pageIndex;
  delete propertiesToKeep.propertyPath;
  return propertiesToKeep;
};

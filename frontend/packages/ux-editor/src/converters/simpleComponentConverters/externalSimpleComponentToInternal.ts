import type { FormComponent } from '../../types/FormComponent';
import { formItemConfigs } from '../../data/formItemConfig';
import type { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';

export const externalSimpleComponentToInternal = (
  externalComponent: ExternalSimpleComponent,
  pageIndex: number | null,
): FormComponent => {
  const defaultProperties = formItemConfigs[externalComponent.type]?.defaultProperties;
  const propertyPath = defaultProperties?.propertyPath;
  return {
    ...(propertyPath ? { propertyPath } : {}),
    ...externalComponent,
    itemType: 'COMPONENT',
    pageIndex,
  };
};

import { FormComponent } from '../../types/FormComponent';
import { formItemConfigs } from '../../data/formItemConfig';
import { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';

export const externalSimpleComponentToInternal = (
  externalComponent: ExternalSimpleComponent,
  pageIndex: number | null,
): FormComponent => {
  const { propertyPath } = formItemConfigs[externalComponent.type].defaultProperties;
  return {
    ...(propertyPath ? { propertyPath } : {}),
    ...externalComponent,
    itemType: 'COMPONENT',
    pageIndex,
  };
};

import type { FormComponent } from '../../types/FormComponent';
import { formItemConfigs } from '../../data/formItemConfig';
import type { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';
import { convertDataBindingToInternalFormat } from '../../utils/dataModelUtils';
import type { IDataModelBindings } from '../../types/global';

export const externalSimpleComponentToInternal = (
  externalComponent: ExternalSimpleComponent,
  pageIndex: number | null,
): FormComponent => {
  const formItemConfig = formItemConfigs[externalComponent.type];
  const propertyPath = formItemConfig?.propertyPath;

  const explicitBindings = convertAllDatamodelBindings(externalComponent);

  return {
    ...(propertyPath ? { propertyPath } : {}),
    ...externalComponent,
    dataModelBindings: explicitBindings,
    itemType: 'COMPONENT',
    pageIndex,
  } as FormComponent;
};

function convertAllDatamodelBindings(externalComponent: ExternalSimpleComponent) {
  return externalComponent.dataModelBindings
    ? Object.entries(externalComponent.dataModelBindings).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: convertDataBindingToInternalFormat(value as IDataModelBindings),
        }),
        {} as typeof externalComponent.dataModelBindings,
      )
    : undefined;
}

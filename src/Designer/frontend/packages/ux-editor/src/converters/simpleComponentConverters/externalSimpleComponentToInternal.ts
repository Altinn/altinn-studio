import type { FormComponent } from '../../types/FormComponent';
import type { SerializedSimpleComponent } from '../../types/SerializedComponent';
import { convertDataBindingToInternalFormat } from '../../utils/dataModelUtils';
import type { IDataModelBindings, IDataModelBindingsKeyValueExplicit } from '../../types/global';

export const externalSimpleComponentToInternal = (
  externalComponent: SerializedSimpleComponent,
  layoutDefaultDataType?: string,
): FormComponent => {
  const explicitBindings =
    externalComponent.dataModelBindings &&
    convertAllDatamodelBindings(layoutDefaultDataType, externalComponent.dataModelBindings);

  return {
    ...externalComponent,
    dataModelBindings: explicitBindings,
  } as FormComponent;
};

function convertAllDatamodelBindings(
  layoutDefaultDataType: string,
  bindings: object,
): IDataModelBindingsKeyValueExplicit {
  return Object.entries(bindings).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: convertDataBindingToInternalFormat(layoutDefaultDataType, value as IDataModelBindings),
    }),
    {},
  );
}

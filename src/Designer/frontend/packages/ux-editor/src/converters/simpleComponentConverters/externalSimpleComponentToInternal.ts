import type { FormComponent } from '../../types/FormComponent';
import type { SerializedSimpleComponent } from '../../types/SerializedComponent';
import { convertDataBindingToInternalFormat } from '../../utils/dataModelUtils';
import type { IDataModelBindings, IDataModelBindingsKeyValueExplicit } from '../../types/global';
import { separateComponentProperties } from '../componentProperties';

export const externalSimpleComponentToInternal = (
  externalComponent: SerializedSimpleComponent,
  layoutDefaultDataType?: string,
): FormComponent => {
  const { known, custom } = separateComponentProperties(externalComponent);
  const explicitBindings =
    externalComponent.dataModelBindings &&
    convertAllDatamodelBindings(layoutDefaultDataType, externalComponent.dataModelBindings);

  return {
    ...known,
    ...(Object.keys(custom).length ? { customProperties: custom } : {}),
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

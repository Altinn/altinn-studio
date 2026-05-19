import type { FormComponent } from '../../types/FormComponent';
import { formItemConfigs } from '../../data/formItemConfig';
import type { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';
import { convertDataBindingToInternalFormat } from '../../utils/dataModelUtils';
import type {
  IDataModelBindings,
  IDataModelBindingsKeyValue,
  IDataModelBindingsKeyValueExplicit,
} from '../../types/global';

export const externalSimpleComponentToInternal = (
  externalComponent: ExternalSimpleComponent,
  pageIndex: number | null,
  layoutDefaultDataType?: string,
): FormComponent => {
  const formItemConfig = formItemConfigs[externalComponent.type];
  const propertyPath = formItemConfig?.propertyPath;

  const explicitBindings =
    externalComponent.dataModelBindings &&
    convertAllDatamodelBindings(layoutDefaultDataType, externalComponent.dataModelBindings);

  return {
    ...(propertyPath ? { propertyPath } : {}),
    ...externalComponent,
    dataModelBindings: explicitBindings,
    itemType: 'COMPONENT',
    pageIndex,
  } as FormComponent;
};

function convertAllDatamodelBindings(
  layoutDefaultDataType: string,
  bindings: IDataModelBindingsKeyValue,
): IDataModelBindingsKeyValueExplicit {
  return Object.entries(bindings).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: convertDataBindingToInternalFormat(layoutDefaultDataType, value as IDataModelBindings),
    }),
    {},
  );
}

import type { FormComponent } from '../../types/FormComponent';
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
  const explicitBindings =
    externalComponent.dataModelBindings &&
    convertAllDatamodelBindings(layoutDefaultDataType, externalComponent.dataModelBindings);

  return {
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

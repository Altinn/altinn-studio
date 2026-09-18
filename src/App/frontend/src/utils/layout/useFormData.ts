import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { FormDataSelector } from 'src/layout';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';

const emptyObject = {};
export function useFormDataFor<T extends CompTypes>(
  baseComponentId: string,
  type?: T | ((type: CompTypes) => boolean),
): IComponentFormData<T> {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, type) as IDataModelBindings<T>;
  return FormStore.data.useDebouncedSelect((pick) => getNodeFormDataInner(dataModelBindings, pick));
}

export function useNodeFormDataWhenType<Type extends CompTypes>(
  baseComponentId: string,
  type: Type,
): IComponentFormData<Type> | undefined {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, type) as IDataModelBindings<Type> | undefined;
  return FormStore.data.useDebouncedSelect((pick) => getNodeFormDataInner(dataModelBindings, pick));
}

function getNodeFormDataInner<T extends CompTypes>(
  dataModelBindings: IDataModelBindings<T> | undefined,
  formDataSelector: FormDataSelector,
): IComponentFormData<T> {
  if (!dataModelBindings) {
    return emptyObject as IComponentFormData<T>;
  }

  const formDataObj: { [key: string]: unknown } = {};
  for (const key of Object.keys(dataModelBindings)) {
    const binding = dataModelBindings[key];
    const data = formDataSelector(binding);

    if (key === 'list') {
      formDataObj[key] = data ?? [];
    } else if (key === 'simpleBinding') {
      formDataObj[key] = data != null ? String(data) : '';
    } else {
      formDataObj[key] = data;
    }
  }

  return formDataObj as IComponentFormData<T>;
}

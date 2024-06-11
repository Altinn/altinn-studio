import type { FormItem } from '@altinn/ux-editor/types/FormItem';

type NewDataModelBinding = {
  property: string | undefined;
  dataType: string | undefined;
};

export const convertDataBindingToInternalFormat = (
  component: FormItem,
  bindingKey: string,
): NewDataModelBinding => {
  const dataModelBinding =
    bindingKey in component.dataModelBindings ? component.dataModelBindings[bindingKey] : undefined;

  const isOldOrNotSetFormat =
    typeof dataModelBinding === 'string' || typeof dataModelBinding === 'undefined';

  if (isOldOrNotSetFormat) {
    return {
      property: dataModelBinding,
      dataType: undefined,
    };
  }
  return dataModelBinding;
};

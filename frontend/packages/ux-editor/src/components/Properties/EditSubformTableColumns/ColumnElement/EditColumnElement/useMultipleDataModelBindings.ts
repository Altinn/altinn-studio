import type { FormItem } from '../../../../../types/FormItem';

export const useMultipleDataModelBinding = (components: FormItem[]) => {
  return components.flatMap((comp) => {
    const dataModelBindings = comp.dataModelBindings || {};
    return Object.entries(dataModelBindings)
      .filter(([, value]) => value)
      .map(([key, value]) => ({ [key]: value }));
  });
};

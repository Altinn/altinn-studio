import type { FormComponent } from '@altinn/ux-editor/types/FormComponent';
import type { FormContainer } from '@altinn/ux-editor/types/FormContainer';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';

export const filterComponentsWithLabelAndBindings = (
  components: (FormComponent | FormContainer)[],
): FormItem[] => {
  return components.filter((comp) => {
    const hasTitle = comp.textResourceBindings?.title;
    const hasDataModelBinding =
      comp.dataModelBindings &&
      Object.keys(comp.dataModelBindings).length > 0 &&
      Object.values(comp.dataModelBindings).some((binding) => !!binding);
    return hasTitle && hasDataModelBinding;
  });
};

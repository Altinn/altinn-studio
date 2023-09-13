import { getSourceOptions } from 'src/hooks/useSourceOptions';
import { getOptionLookupKey } from 'src/utils/options';
import type { IFormData } from 'src/features/formData';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IOption, ISelectionComponent } from 'src/layout/common.generated';
import type { IOptions } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function getOptionList(
  component: ISelectionComponent,
  options: IOptions,
  langTools: IUseLanguage,
  node: LayoutNode,
  formData: IFormData,
): IOption[] {
  if (component.options) {
    return component.options;
  }
  if (component.optionsId) {
    const key = getOptionLookupKey({
      id: component.optionsId,
      mapping: component.mapping,
    });
    return options[key]?.options || [];
  }
  if (component.source) {
    return (
      getSourceOptions({
        source: component.source,
        langTools,
        node,
        formData,
      }) || []
    );
  }

  return [];
}

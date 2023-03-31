import { useAppSelector } from 'src/hooks/useAppSelector';
import { getOptionLookupKey, getRelevantFormDataForOptionSource, setupSourceOptions } from 'src/utils/options';
import type { ISelectionComponent } from 'src/layout/layout';
import type { IOption } from 'src/types';

export function useOptionList(component: ISelectionComponent): IOption[] {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const formData = useAppSelector((state) => state.formData.formData);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const options = useAppSelector((state) => state.optionState.options);

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
    const relevantTextResource = textResources.find((e) => e.id === component.source?.label);
    const reduxOptions =
      relevantTextResource &&
      setupSourceOptions({
        source: component.source,
        relevantTextResource,
        relevantFormData: getRelevantFormDataForOptionSource(formData, component.source),
        repeatingGroups,
        dataSources: {
          dataModel: formData,
        },
      });
    return reduxOptions || [];
  }

  return [];
}

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getOptionLookupKey, getRelevantFormDataForOptionSource, setupSourceOptions } from 'src/utils/options';
import type { IFormData } from 'src/features/formData';
import type { ISelectionComponent } from 'src/layout/layout';
import type { IOption, IOptions, IRepeatingGroups, ITextResource } from 'src/types';

export function useOptionList(component: ISelectionComponent): IOption[] {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const formData = useAppSelector((state) => state.formData.formData);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const options = useAppSelector((state) => state.optionState.options);
  return getOptionList(component, textResources, formData, repeatingGroups, options);
}

export function getOptionList(
  component: ISelectionComponent,
  textResources: ITextResource[],
  formData: IFormData,
  repeatingGroups: IRepeatingGroups | null,
  options: IOptions,
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
    const relevantTextResourceLabel = textResources.find(
      (resourceLabel) => resourceLabel.id === component.source?.label,
    );
    const reduxOptions =
      relevantTextResourceLabel &&
      setupSourceOptions({
        source: component.source,
        relevantTextResources: { label: relevantTextResourceLabel },
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

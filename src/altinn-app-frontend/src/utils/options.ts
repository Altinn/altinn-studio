import type { IDataSources } from 'altinn-shared/types';
import { replaceTextResourceParams } from 'altinn-shared/utils';
import type { IFormData } from 'src/features/form/data';
import type {
  IMapping,
  IOption,
  IOptionSource,
  IRepeatingGroups,
  ITextResource,
} from 'src/types';

export function getOptionLookupKey(id: string, mapping?: IMapping) {
  if (!mapping) {
    return id;
  }

  return JSON.stringify({ id, mapping });
}

export function replaceOptionDataField(
  formData: IFormData,
  valueString: string,
  index: number,
) {
  const indexedValueString = valueString.replace('{0}', index.toString());
  return formData[indexedValueString];
}

export function getRelevantFormDataForOptionSource(
  formData: IFormData,
  source: IOptionSource,
) {
  const relevantFormData: IFormData = {};

  if (!formData || !source) {
    return relevantFormData;
  }

  Object.keys(formData).forEach((key) => {
    if (key.includes(source.group)) {
      relevantFormData[key] = formData[key];
    }
  });

  return relevantFormData;
}

interface ISetupSourceOptionsParams {
  source: IOptionSource;
  relevantTextResource: ITextResource;
  relevantFormData: IFormData;
  repeatingGroups: IRepeatingGroups;
  dataSources: IDataSources;
}

export function setupSourceOptions({
  source,
  relevantTextResource,
  relevantFormData,
  repeatingGroups,
  dataSources,
}: ISetupSourceOptionsParams) {
  const replacedOptionLabels = replaceTextResourceParams(
    [relevantTextResource],
    dataSources,
    repeatingGroups,
  );

  const repGroup = Object.values(repeatingGroups).find((group) => {
    return group.dataModelBinding === source.group;
  });

  const options: IOption[] = [];
  for (let i = 0; i <= repGroup.index; i++) {
    const option: IOption = {
      label: replacedOptionLabels[i + 1].value,
      value: replaceOptionDataField(relevantFormData, source.value, i),
    };
    options.push(option);
  }
  return options;
}

import {
  getParsedLanguageFromText,
  getTextResourceByKey,
  replaceTextResourceParams,
} from 'src/language/sharedLanguage';
import {
  getBaseGroupDataModelBindingFromKeyWithIndexIndicators,
  getGroupDataModelBinding,
  getIndexCombinations,
  keyHasIndexIndicators,
  replaceIndexIndicatorsWithIndexes,
} from 'src/utils/databindings';
import type { IFormData } from 'src/features/formData';
import type { IOptionResources } from 'src/hooks/useGetOptions';
import type { ILayout } from 'src/layout/layout';
import type {
  IMapping,
  IOption,
  IOptions,
  IOptionsMetaData,
  IOptionSource,
  IRepeatingGroups,
  ITextResource,
} from 'src/types';
import type { IDataSources } from 'src/types/shared';

export function getOptionLookupKey({ id, mapping }: IOptionsMetaData) {
  if (!mapping) {
    return id;
  }

  return JSON.stringify({ id, mapping });
}

interface IGetOptionLookupKeysParam extends IOptionsMetaData {
  repeatingGroups: IRepeatingGroups;
}

interface IOptionLookupKeys {
  keys: IOptionsMetaData[];
  keyWithIndexIndicator?: IOptionsMetaData;
}

export function getOptionLookupKeys({
  id,
  mapping,
  secure,
  repeatingGroups,
}: IGetOptionLookupKeysParam): IOptionLookupKeys {
  const lookupKeys: IOptionsMetaData[] = [];

  const mappingsWithIndexIndicators = Object.keys(mapping || {}).filter((key) => keyHasIndexIndicators(key));

  if (mappingsWithIndexIndicators.length && mapping) {
    // create lookup keys for each index of the relevant repeating group
    mappingsWithIndexIndicators.forEach((mappingKey) => {
      const baseGroupBindings = getBaseGroupDataModelBindingFromKeyWithIndexIndicators(mappingKey);
      const possibleCombinations = getIndexCombinations(baseGroupBindings, repeatingGroups);
      for (const possibleCombination of possibleCombinations) {
        const newMappingKey = replaceIndexIndicatorsWithIndexes(mappingKey, possibleCombination);
        const newMapping: IMapping = {
          ...mapping,
        };
        delete newMapping[mappingKey];
        newMapping[newMappingKey] = mapping[mappingKey];
        lookupKeys.push({ id, mapping: newMapping, secure });
      }
    });

    return {
      keys: lookupKeys,
      keyWithIndexIndicator: { id, mapping, secure },
    };
  }

  lookupKeys.push({ id, mapping, secure });
  return {
    keys: lookupKeys,
  };
}

/**
 * @deprecated Move this functionality to the node hierarchy?
 */
export function replaceOptionDataField(formData: IFormData, valueString: string, index: number) {
  const indexedValueString = valueString.replace('{0}', index.toString());
  return formData[indexedValueString];
}

export function getRelevantFormDataForOptionSource(formData: IFormData, source: IOptionSource) {
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
  relevantTextResources: IOptionResources;
  relevantFormData: IFormData;
  repeatingGroups: IRepeatingGroups | null;
  dataSources: IDataSources;
}

/**
 * @deprecated Move this functionality to the node hierarchy?
 */
export function setupSourceOptions({
  source,
  relevantTextResources,
  relevantFormData,
  repeatingGroups,
  dataSources,
}: ISetupSourceOptionsParams) {
  const replacedOptionLabels = relevantTextResources.label
    ? replaceTextResourceParams([relevantTextResources.label], dataSources, repeatingGroups)
    : [];
  const replacedOptionDescriptions = relevantTextResources.description
    ? replaceTextResourceParams([relevantTextResources.description], dataSources, repeatingGroups)
    : [];
  const replacedOptionLabelsHelpTexts = relevantTextResources.helpText
    ? replaceTextResourceParams([relevantTextResources.helpText], dataSources, repeatingGroups)
    : [];

  const repGroup = Object.values(repeatingGroups || {}).find((group) => group.dataModelBinding === source.group);

  if (!repGroup) {
    return undefined;
  }

  const options: IOption[] = [];
  for (let i = 0; i <= repGroup.index; i++) {
    if (typeof replacedOptionLabels[i + 1]?.value !== 'undefined') {
      const option: IOption = {
        value: replaceOptionDataField(relevantFormData, source.value, i),
        label: replacedOptionLabels[i + 1].value,
        description: replacedOptionDescriptions[i + 1]?.value,
        helpText: replacedOptionLabelsHelpTexts[i + 1]?.value,
      };
      options.push(option);
    }
  }
  return options;
}

interface IRemoveGroupOptionsByIndexParams {
  groupId: string;
  index: number;
  repeatingGroups: IRepeatingGroups;
  options: IOptions;
  layout: ILayout;
}
export function removeGroupOptionsByIndex({
  groupId,
  index,
  repeatingGroups,
  options,
  layout,
}: IRemoveGroupOptionsByIndexParams) {
  const newOptions: IOptions = {};
  const repeatingGroup = repeatingGroups[groupId];
  const groupDataBinding = getGroupDataModelBinding(repeatingGroup, groupId, layout);

  Object.keys(options || {}).forEach((optionKey) => {
    const { mapping, id } = options[optionKey] || {};
    if (id === undefined) {
      return;
    }

    if (!mapping) {
      newOptions[optionKey] = options[optionKey];
      return;
    }
    const shouldBeDeleted = Object.keys(mapping).some((mappingKey) =>
      mappingKey.startsWith(`${groupDataBinding}[${index}]`),
    );

    if (shouldBeDeleted) {
      return;
    }

    let newMapping;
    if (index <= repeatingGroup.index) {
      newMapping = {
        ...mapping,
      };
      // the indexed to be deleted is lower than total indexes, shift all above
      for (let shiftIndex = index + 1; shiftIndex <= repeatingGroup.index + 1; shiftIndex++) {
        const shouldBeShifted = Object.keys(mapping).filter((mappingKey) =>
          mappingKey.startsWith(`${groupDataBinding}[${shiftIndex}]`),
        );

        shouldBeShifted?.forEach((key) => {
          const newKey = key.replace(`${groupDataBinding}[${shiftIndex}]`, `${groupDataBinding}[${shiftIndex - 1}]`);
          delete newMapping[key];
          newMapping[newKey] = mapping[key];
        });
      }
    }

    const newOptionsKey = getOptionLookupKey({ id, mapping: newMapping });

    newOptions[newOptionsKey] = {
      ...options[optionKey],
      id,
      mapping: newMapping,
    };
  });

  return newOptions;
}

export function duplicateOptionFilter(currentOption: IOption, currentIndex: number, options: IOption[]): boolean {
  for (let i = 0; i < currentIndex; i++) {
    if (currentOption.value === options[i].value) {
      return false;
    }
  }
  return true;
}

export function formatLabelForSelect(option: IOption, textResources: ITextResource[]): React.ReactNode {
  const label = getTextResourceByKey(option.label, textResources) ?? option.value;
  if (option.description) {
    const description = getTextResourceByKey(option.description, textResources);
    return getParsedLanguageFromText(`<b>${label}</b><br><span>${description}</span>`);
  } else {
    return getParsedLanguageFromText(`<span>${label}</span>`);
  }
}

import {
  getBaseGroupDataModelBindingFromKeyWithIndexIndicators,
  getGroupDataModelBinding,
  getIndexCombinations,
  keyHasIndexIndicators,
  replaceIndexIndicatorsWithIndexes,
} from 'src/utils/databindings';
import type { IFormData } from 'src/features/form/data';
import type { ILayout } from 'src/features/form/layout';
import type {
  IMapping,
  IOption,
  IOptions,
  IOptionsMetaData,
  IOptionSource,
  IRepeatingGroups,
  ITextResource,
} from 'src/types';

import { replaceTextResourceParams } from 'altinn-shared/utils';
import type { IDataSources } from 'altinn-shared/types';

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

  const mappingsWithIndexIndicators = Object.keys(mapping || {}).filter((key) =>
    keyHasIndexIndicators(key),
  );

  if (mappingsWithIndexIndicators.length) {
    // create lookup keys for each index of the relevant repeating group
    mappingsWithIndexIndicators.forEach((mappingKey) => {
      const baseGroupBindings =
        getBaseGroupDataModelBindingFromKeyWithIndexIndicators(mappingKey);
      const possibleCombinations = getIndexCombinations(
        baseGroupBindings,
        repeatingGroups,
      );
      for (const possibleCombination of possibleCombinations) {
        const newMappingKey = replaceIndexIndicatorsWithIndexes(
          mappingKey,
          possibleCombination,
        );
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
  const groupDataBinding = getGroupDataModelBinding(
    repeatingGroup,
    groupId,
    layout,
  );

  Object.keys(options || {}).forEach((optionKey) => {
    const { mapping, id } = options[optionKey];
    if (!mapping) {
      newOptions[optionKey] = options[optionKey];
      return;
    }
    const shouldBeDeleted = Object.keys(mapping).some((mappingKey) => {
      return mappingKey.startsWith(`${groupDataBinding}[${index}]`);
    });

    if (shouldBeDeleted) {
      return;
    }

    let newMapping;
    if (index <= repeatingGroup.index) {
      newMapping = {
        ...mapping,
      };
      // the indexed to be deleted is lower than total indexes, shift all above
      for (
        let shiftIndex = index + 1;
        shiftIndex <= repeatingGroup.index + 1;
        shiftIndex++
      ) {
        const shouldBeShifted = Object.keys(mapping).filter((mappingKey) => {
          return mappingKey.startsWith(`${groupDataBinding}[${shiftIndex}]`);
        });

        shouldBeShifted?.forEach((key) => {
          const newKey = key.replace(
            `${groupDataBinding}[${shiftIndex}]`,
            `${groupDataBinding}[${shiftIndex - 1}]`,
          );
          delete newMapping[key];
          newMapping[newKey] = mapping[key];
        });
      }
    }

    const newOptionsKey = getOptionLookupKey({ id, mapping: newMapping });

    newOptions[newOptionsKey] = {
      ...options[optionKey],
      mapping: newMapping,
    };
  });

  return newOptions;
}

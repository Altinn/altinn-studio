import {
  getBaseGroupDataModelBindingFromKeyWithIndexIndicators,
  getIndexCombinations,
  keyHasIndexIndicators,
  replaceIndexIndicatorsWithIndexes,
} from 'src/utils/databindings';
import type { IDataListsMetaData } from 'src/shared/resources/dataLists/index';
import type { IMapping, IRepeatingGroups } from 'src/types';

interface IGetDataListLookupKeysParam extends IDataListsMetaData {
  repeatingGroups: IRepeatingGroups | null;
}

interface IDataListLookupKeys {
  keys: IDataListsMetaData[];
  keyWithIndexIndicator?: IDataListsMetaData;
}

export function getDataListLookupKey({ id, mapping }: IDataListsMetaData) {
  if (!mapping) {
    return id;
  }

  return JSON.stringify({ id, mapping });
}

export function getDataListLookupKeys({
  id,
  mapping,
  secure,
  repeatingGroups,
}: IGetDataListLookupKeysParam): IDataListLookupKeys {
  const lookupKeys: IDataListsMetaData[] = [];

  const _mapping = mapping || {};
  const mappingsWithIndexIndicators = Object.keys(_mapping).filter((key) => keyHasIndexIndicators(key));
  if (mappingsWithIndexIndicators.length) {
    // create lookup keys for each index of the relevant repeating group
    mappingsWithIndexIndicators.forEach((mappingKey) => {
      const baseGroupBindings = getBaseGroupDataModelBindingFromKeyWithIndexIndicators(mappingKey);
      const possibleCombinations = getIndexCombinations(baseGroupBindings, repeatingGroups);
      for (const possibleCombination of possibleCombinations) {
        const newMappingKey = replaceIndexIndicatorsWithIndexes(mappingKey, possibleCombination);
        const newMapping: IMapping = {
          ..._mapping,
        };
        delete newMapping[mappingKey];
        newMapping[newMappingKey] = _mapping[mappingKey];
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

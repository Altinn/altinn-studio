import type { CodeListItem } from './types/CodeListItem';
import type { CodeListWithTextResources } from './types/CodeListWithTextResources';
import { ArrayUtils } from '@studio/pure-functions';
import { CodeListItemType } from './types/CodeListItemType';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';

export const emptyStringItem: CodeListItem = {
  value: '',
  label: '',
};

export const emptyNumberItem: CodeListItem = {
  value: 0,
  label: '',
};

export const emptyBooleanItem: CodeListItem = {
  value: false,
  label: '',
};

export function addNewCodeListItem(
  codeList: CodeListWithTextResources,
  codeType: CodeListItemType,
): CodeListWithTextResources {
  const newEmptyItem = createEmptyItem(codeType);
  return addCodeListItem(codeList, newEmptyItem);
}

function createEmptyItem(codeType: CodeListItemType): CodeListItem {
  switch (codeType) {
    case 'number':
      return emptyNumberItem;
    case 'boolean':
      return emptyBooleanItem;
    default:
      return emptyStringItem;
  }
}

export function getTypeOfLastValue(codeList: CodeListWithTextResources): CodeListItemType {
  if (isCodeListEmpty(codeList)) {
    throw new Error('Cannot get type of last value from empty code list');
  }

  const lastCodeListItem = ArrayUtils.last(codeList);
  switch (typeof lastCodeListItem.value) {
    case 'number':
      return CodeListItemType.Number;
    case 'boolean':
      return CodeListItemType.Boolean;
    default:
      return CodeListItemType.String;
  }
}

function addCodeListItem(
  codeList: CodeListWithTextResources,
  item: CodeListItem,
): CodeListWithTextResources {
  return [...codeList, item];
}

export function removeCodeListItem(
  codeList: CodeListWithTextResources,
  index: number,
): CodeListWithTextResources {
  return ArrayUtils.removeItemByIndex<CodeListItem>(codeList, index);
}

export function changeCodeListItem(
  codeList: CodeListWithTextResources,
  index: number,
  newItem: CodeListItem,
): CodeListWithTextResources {
  return ArrayUtils.replaceByIndex<CodeListItem>(codeList, index, newItem);
}

export function isCodeListEmpty(codeList: CodeListWithTextResources): boolean {
  return codeList.length === 0;
}

export function evaluateDefaultType(codeList: CodeListWithTextResources): CodeListItemType {
  return isCodeListEmpty(codeList) ? CodeListItemType.String : getTypeOfLastValue(codeList);
}

export function isCodeLimitReached(
  codeList: CodeListWithTextResources,
  codeType: CodeListItemType,
): boolean {
  const booleanCodeLimit = 2;
  return codeType === CodeListItemType.Boolean && codeList.length >= booleanCodeLimit;
}

type UpdateCodeListArgs = {
  newValue: string | null;
  codeItemIndex: number;
  property: CodeListItemTextProperty;
};

export function updateCodeList(
  codeList: CodeListWithTextResources,
  updateArgs: UpdateCodeListArgs,
): CodeListWithTextResources {
  const { property, codeItemIndex, newValue } = updateArgs;
  const newCodeList: CodeListWithTextResources = [...codeList];
  const oldItem: CodeListItem = newCodeList[codeItemIndex];

  switch (property) {
    case CodeListItemTextProperty.Label: {
      newCodeList[codeItemIndex] = { ...oldItem, label: newValue };
      break;
    }
    case CodeListItemTextProperty.Description: {
      newCodeList[codeItemIndex] = { ...oldItem, description: newValue };
      break;
    }
    case CodeListItemTextProperty.HelpText: {
      newCodeList[codeItemIndex] = { ...oldItem, helpText: newValue };
      break;
    }
  }

  return newCodeList;
}

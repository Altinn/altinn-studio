import type { CodeList } from '../types/CodeList';
import type { CodeListValueType } from '../types/CodeListValueType';
import type { CodeListItemValue } from '../types/CodeListItemValue';

export function updateCodeListValueType(codeList: CodeList): void {
  const updatedCodeListValueType = inferValueType(codeList);
  coerceValues(codeList, updatedCodeListValueType);
}

export function inferValueType(codeList: CodeList): CodeListValueType {
  switch (true) {
    case codeList.length === 0:
      return 'undefined';
    case allValuesFitNumber(codeList):
      return 'number';
    case allValuesFitBoolean(codeList):
      return 'boolean';
    default:
      return 'string';
  }
}

function allValuesFitNumber(codeList: CodeList): boolean {
  return codeList.every((codeListItem) => valueFitsNumber(codeListItem.value));
}

function allValuesFitBoolean(codeList: CodeList): boolean {
  return codeList.every((codeListItem) => valueFitsBoolean(codeListItem.value));
}

function valueFitsNumber(value: CodeListItemValue): boolean {
  return !valueIsNaN(value) && !valueIsEmptyString(value) && !valueFitsBoolean(value);
}

function valueIsNaN(value: CodeListItemValue): boolean {
  return isNaN(Number(value));
}

function valueIsEmptyString(value: CodeListItemValue): boolean {
  return value === '';
}

function valueFitsBoolean(value: CodeListItemValue): boolean {
  const lowerCaseValue = String(value).toLowerCase();
  return lowerCaseValue === 'true' || lowerCaseValue === 'false';
}

function coerceValues(codeList: CodeList, type: CodeListValueType): void {
  codeList.forEach((codeListItem) => {
    switch (type) {
      case 'number':
        codeListItem.value = Number(codeListItem.value);
        break;
      case 'boolean':
        codeListItem.value = coerceBoolean(codeListItem.value);
        break;
      case 'string':
      case 'undefined':
      default:
        codeListItem.value = String(codeListItem.value);
    }
  });
}

function coerceBoolean(value: CodeListItemValue): boolean {
  const valueAsString = String(value);
  return valueAsString.toLowerCase() === 'true';
}

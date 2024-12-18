import type { CodeList } from '../types/CodeList';
import type { CodeListValueType } from '../types/CodeListValueType';
import type { CodeListItemValue } from '../types/CodeListItemValue';

export function updateCodeListValueType(codeList: CodeList): void {
  const updatedCodeListValueType = getValueType(codeList);
  coerceValues(codeList, updatedCodeListValueType);
}

export function getValueType(codeList: CodeList): CodeListValueType {
  switch (true) {
    case codeList.length === 0:
      return 'undefined';
    case someValuesAreNumbers(codeList):
      return 'number';
    case someValuesAreBooleans(codeList):
      return 'boolean';
    default:
      return 'string';
  }
}

function someValuesAreNumbers(codeList: CodeList): boolean {
  return codeList.some((codeListItem) => typeof codeListItem.value === 'number');
}

function someValuesAreBooleans(codeList: CodeList): boolean {
  return codeList.some((codeListItem) => typeof codeListItem.value === 'boolean');
}

function coerceValues(codeList: CodeList, type: CodeListValueType): void {
  codeList.forEach((codeListItem) => {
    switch (type) {
      case 'number':
        codeListItem.value = tryCoerceNumber(codeListItem.value);
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

function tryCoerceNumber(value: CodeListItemValue): string | number {
  if (value === '') return value; // Avoids prefilling the value field in new options with "0"
  return Number(value);
}

function coerceBoolean(value: CodeListItemValue): boolean {
  const valueAsString = String(value);
  return valueAsString.toLowerCase() === 'true';
}

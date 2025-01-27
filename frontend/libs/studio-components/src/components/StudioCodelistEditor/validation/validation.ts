import type { CodeList } from '../types/CodeList';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import type { ValueError } from '../types/ValueError';
import { ArrayUtils } from '@studio/pure-functions';
import type { ValueErrorMap } from '../types/ValueErrorMap';

export function isCodeListValid(codeList: CodeList): boolean {
  const errors = findCodeListErrors(codeList);
  return !areThereCodeListErrors(errors);
}

export function findCodeListErrors(codeList: CodeList): ValueErrorMap {
  const values: CodeListItemValue[] = codeList.map((item) => item.value);
  return mapValueErrors(values);
}

function mapValueErrors(values: CodeListItemValue[]): ValueErrorMap {
  return values.map((value) => findValueError(value, values));
}

function findValueError(
  value: CodeListItemValue,
  allValues: CodeListItemValue[],
): ValueError | null {
  if (ArrayUtils.isDuplicate(value, allValues)) return 'duplicateValue';
  if (ArrayUtils.countUniqueTypes(allValues) > 1) return 'multipleValueTypes';
  if (value === undefined) return 'undefinedValue';
  else return null;
}

export function areThereCodeListErrors(errorMap: ValueErrorMap): boolean {
  return errorMap.some((item) => item !== null);
}

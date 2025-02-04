import type { CodeList } from '../types/CodeList';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import type { ValueError } from '../types/ValueError';
import { ArrayUtils } from '@studio/pure-functions';
import type { ValueErrorMap } from '../types/ValueErrorMap';
import type { TypeofResult } from '../types/TypeofResult';

export function isFieldValid(value: unknown): boolean {
  const type: TypeofResult = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

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
  if (value === undefined) return 'undefinedValue';
  if (ArrayUtils.isDuplicate(value, allValues)) return 'duplicateValue';
  if (!ArrayUtils.hasSingularType(allValues)) return 'multipleTypes';
  else return null;
}

export function areThereCodeListErrors(errorMap: ValueErrorMap): boolean {
  return errorMap.some((item) => item !== null);
}

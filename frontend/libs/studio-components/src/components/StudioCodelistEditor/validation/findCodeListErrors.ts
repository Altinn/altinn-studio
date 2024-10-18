import { CodeList } from '../types/CodeList';
import { CodeListError } from '../types/CodeListError';
import { ArrayUtils } from '@studio/pure-functions';

export function findCodeListErrors(codeList: CodeList): CodeListError[] {
  const values = codeList.map((item) => item.value);
  return findValueErrors(values);
}

const findValueErrors = (values: string[]): CodeListError[] => {
  const errors = [];
  if (areThereEmptyValues(values)) errors.push('emptyValues');
  if (areThereDuplicateValues(values)) errors.push('duplicateValues');
  return errors;
};

function areThereEmptyValues(values: string[]): boolean {
  return values.some((value) => value === '');
}

function areThereDuplicateValues(values: string[]): boolean {
  return ArrayUtils.areThereNonEmptyStringDuplicates(values);
}

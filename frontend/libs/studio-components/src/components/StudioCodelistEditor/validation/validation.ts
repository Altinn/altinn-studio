import type { CodeList } from '../types/CodeList';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import type { ValueError } from '../types/ValueError';
import { ArrayUtils } from '@studio/pure-functions';
import type { ValueErrorMap } from '../types/ValueErrorMap';
import { CodeListType } from '../types/CodeListType';

export function isCodeListValid(codeList: CodeList, codeListType: CodeListType): boolean {
  const errors = findCodeListErrors(codeList, codeListType);
  return !areThereCodeListErrors(errors);
}

export function findCodeListErrors(codeList: CodeList, codeListType: CodeListType): ValueErrorMap {
  const values: CodeListItemValue[] = codeList.map((item) => item.value);
  return mapValueErrors(values, codeListType);
}

function mapValueErrors(values: CodeListItemValue[], codeListType: CodeListType): ValueErrorMap {
  return values.map((value) => findValueError(value, values, codeListType));
}

function findValueError(
  value: CodeListItemValue,
  allValues: CodeListItemValue[],
  codeListType: CodeListType,
): ValueError | null {
  if (!valueFitsCodeListType(value, codeListType)) {
    return 'typeMismatch';
  } else if (ArrayUtils.isDuplicate(value, allValues)) {
    return 'duplicateValue';
  } else {
    return null;
  }
}

export function areThereCodeListErrors(errorMap: ValueErrorMap): boolean {
  return errorMap.some((item) => item !== null);
}

// Does not validate after clearing error?
const valueFitsCodeListType = (value: CodeListItemValue, codeListType: CodeListType): boolean => {
  console.log(typeof value + value);
  switch (codeListType) {
    case 'string':
      return true;
    case 'number':
      return isValueNumber(value);
    case 'boolean':
      return isValueBoolean(value);
  }
};

const isValueNumber = (value: CodeListItemValue): boolean => {
  return !isNaN(Number(value));
};

const isValueBoolean = (value: CodeListItemValue): boolean => {
  return (
    typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')
  );
};

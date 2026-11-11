import type { StringExpression } from '@designer/components';

export const getDisplayValues = (value: StringExpression) => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((val: string) => val.trim()).join(', ');
  }

  return value;
};

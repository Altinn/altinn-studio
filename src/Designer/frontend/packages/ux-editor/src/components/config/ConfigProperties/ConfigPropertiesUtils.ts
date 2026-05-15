import type { FormItem } from '../../../types/FormItem';

type ComponentComparisonProps = {
  initialComponent: FormItem;
  currentComponent: FormItem;
};

export const componentComparison = ({
  initialComponent,
  currentComponent,
}: ComponentComparisonProps): boolean => {
  return JSON.stringify(initialComponent) === JSON.stringify(currentComponent);
};

export const propHasValues = (value: unknown): boolean => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;

  switch (typeof value) {
    case 'string':
      return value.trim().length > 0;
    case 'object':
      return Object.keys(value).length > 0;
    case 'boolean':
      return true;
  }
};

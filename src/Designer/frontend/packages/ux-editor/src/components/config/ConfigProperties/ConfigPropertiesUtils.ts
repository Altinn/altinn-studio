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

type DisplayValueProps = {
  component: FormItem;
  propertyKey: string;
};

export const getDisplayValue = ({
  component,
  propertyKey,
}: DisplayValueProps): string | undefined => {
  const value = component[propertyKey];

  if (value == null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, v]) => `${key}: ${v}`)
      .join(', ');
  }

  return value;
};

export const propHasValues = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value as object).length > 0;
  }

  if (typeof value === 'boolean') {
    return true;
  }

  return false;
};

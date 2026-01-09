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

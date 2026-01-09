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

import type { IRawOption } from 'src/layout/common.generated';

export interface CommonProps {
  onChange: (nextValue: string) => void;
  currentValue?: string;
  label: string | undefined;
  required?: boolean;
  options?: IRawOption[];
  pageOrder?: string[];
}

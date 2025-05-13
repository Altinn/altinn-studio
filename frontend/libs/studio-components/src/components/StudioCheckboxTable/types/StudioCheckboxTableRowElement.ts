import type { ReactNode } from 'react';

export type StudioCheckboxTableRowElement = {
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  error?: ReactNode;
};

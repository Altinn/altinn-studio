import type { StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import type { StudioCheckboxTableContextProps } from '../StudioCheckboxTableContext';

export const mockCheckboxTitle: string = 'Test group';
export const option1: StudioCheckboxTableRowElement = {
  value: 'option1',
  label: 'Option 1',
  checked: false,
};
export const option2: StudioCheckboxTableRowElement = {
  value: 'option2',
  label: 'Option 2',
  checked: false,
};
export const checkedOption: StudioCheckboxTableRowElement = {
  value: 'checked',
  label: 'Checked Option',
  checked: true,
};
export const mockGetCheckboxProps: StudioGetCheckboxProps = {
  onChange: () => {},
};
export const defaultStudioCheckboxContextProps: StudioCheckboxTableContextProps = {
  hasError: false,
};

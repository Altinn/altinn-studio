import type { CheckboxGroupProps } from '@digdir/designsystemet-react';
import { createContext } from 'react';
import { DEFAULT_CHECKBOX_SIZE } from './constants';

export type StudioCheckboxGroupContextProps = Pick<CheckboxGroupProps, 'size'>;

export const StudioCheckboxGroupContext = createContext<StudioCheckboxGroupContextProps>({
  size: DEFAULT_CHECKBOX_SIZE,
});

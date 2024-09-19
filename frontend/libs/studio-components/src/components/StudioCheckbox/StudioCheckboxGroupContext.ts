import type { CheckboxGroupProps } from '@digdir/designsystemet-react';
import { createContext } from 'react';

export type StudioCheckboxGroupContextProps = Pick<CheckboxGroupProps, 'size'>;

export const StudioCheckboxGroupContext = createContext<StudioCheckboxGroupContextProps>({
  size: 'sm',
});

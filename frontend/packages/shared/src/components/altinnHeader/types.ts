import { ButtonProps } from '@digdir/design-system-react';

export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  title: string;
  menuKey: string;
  buttonVariant: ButtonProps['variant'];
  buttonColor?: ButtonProps['color'];
  headerButtonsClasses: any;
  handleClick: () => void;
}

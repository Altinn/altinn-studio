import { ButtonVariant, ButtonColor } from '@digdir/design-system-react';

export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  title: string;
  menuKey: string;
  buttonVariant: ButtonVariant;
  buttonColor?: ButtonColor;
  headerButtonsClasses: any;
  handleClick: () => void;
  inBeta?: boolean;
}

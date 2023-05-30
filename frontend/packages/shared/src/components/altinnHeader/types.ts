import { ButtonVariant } from '@digdir/design-system-react';

export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  title: string;
  menuKey: string;
  buttonVariant: ButtonVariant;
  headerButtonsClasses: any;
  handleClick: () => void;
  inBeta?: boolean;
}

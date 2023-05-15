import { ButtonVariant } from '@digdir/design-system-react';

export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  title: string;
  path: (org: string, app: string) => string;
  menuKey: string;
  buttonVariant: ButtonVariant;
  headerButtonsClasses: any;
}

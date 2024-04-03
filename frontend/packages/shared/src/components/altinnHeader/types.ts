export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  title: string;
  menuKey: string;
  to: string;
  isInverted?: boolean;
}

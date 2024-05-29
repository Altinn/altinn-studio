import type { TopBarMenu } from 'app-shared/enums/TopBarMenu';

export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  menuKey: TopBarMenu;
  to: string;
  isInverted?: boolean;
}

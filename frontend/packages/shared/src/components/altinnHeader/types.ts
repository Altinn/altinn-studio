import type { TopBarMenu } from 'app-shared/enums/TopBarMenu';

// TODO DELETE??
export type AltinnHeaderVariant = 'regular' | 'preview';

// TODO DELETE??
export interface AltinnButtonActionItem {
  menuKey: TopBarMenu;
  to: string;
  isInverted?: boolean;
}

export type { StudioMenuTabType } from '../StudioContentMenu/types/StudioMenuTabType';
import { StudioContentMenu as StudioContentMenuRoot } from './StudioContentMenu';
import { StudioButtonTab } from './StudioButtonTab';
import { StudioLinkTab } from './StudioLinkTab';

type StudioContentMenuComponent = typeof StudioContentMenuRoot & {
  ButtonTab: typeof StudioButtonTab;
  LinkTab: typeof StudioLinkTab;
};

export const StudioContentMenu = StudioContentMenuRoot as StudioContentMenuComponent;

StudioContentMenu.ButtonTab = StudioButtonTab;
StudioContentMenu.LinkTab = StudioLinkTab;

//StudioContentMenu.displayName = 'StudioContentMenu';
//StudioContentMenu.ButtonTab.displayName = 'StudioContentMenu.ButtonTab';
//StudioContentMenu.LinkTab.displayName = 'StudioContentMenu.LinkTab';

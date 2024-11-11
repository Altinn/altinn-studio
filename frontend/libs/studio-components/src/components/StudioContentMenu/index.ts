export type { StudioContentMenuButtonTabProps } from './StudioContentMenuButtonTab';
export type { StudioContentMenuLinkTabProps } from './StudioContentMenuLinkTab';
import { StudioContentMenu as StudioContentMenuRoot } from './StudioContentMenu';
import { StudioContentMenuBase } from './StudioContentMenuBase';
import { StudioContentMenuButtonTab } from './StudioContentMenuButtonTab';
import { StudioContentMenuLinkTab } from './StudioContentMenuLinkTab';

type StudioContentMenuComponent = typeof StudioContentMenuRoot & {
  ButtonTab: typeof StudioContentMenuButtonTab;
  LinkTab: typeof StudioContentMenuLinkTab;
  Controlled: typeof StudioContentMenuBase;
};

export const StudioContentMenu = StudioContentMenuRoot as StudioContentMenuComponent;

StudioContentMenu.ButtonTab = StudioContentMenuButtonTab;
StudioContentMenu.LinkTab = StudioContentMenuLinkTab;
StudioContentMenu.Controlled = StudioContentMenuBase;

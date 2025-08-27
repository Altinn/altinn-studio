export type { StudioContentMenuButtonTabProps } from './StudioContentMenuButtonTab';
export type { StudioContentMenuLinkTabProps } from './StudioContentMenuLinkTab';
import { StudioContentMenuDynamic } from './StudioContentMenuDynamic';
import { StudioContentMenuBase } from './StudioContentMenuBase';
import { StudioContentMenuButtonTab } from './StudioContentMenuButtonTab';
import { StudioContentMenuLinkTab } from './StudioContentMenuLinkTab';

type StudioContentMenuComponent = typeof StudioContentMenuDynamic & {
  ButtonTab: typeof StudioContentMenuButtonTab;
  LinkTab: typeof StudioContentMenuLinkTab;
  Static: typeof StudioContentMenuBase;
};

/**
 * @deprecated Use `StudioContentMenu` from `@studio/components` instead.
 */
export const StudioContentMenu = StudioContentMenuDynamic as StudioContentMenuComponent;

StudioContentMenu.ButtonTab = StudioContentMenuButtonTab;
StudioContentMenu.LinkTab = StudioContentMenuLinkTab;
StudioContentMenu.Static = StudioContentMenuBase;

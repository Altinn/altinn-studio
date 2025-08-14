import {
  StudioPageHeader as StudioPageHeaderParent,
  type StudioPageHeaderProps,
} from './StudioPageHeader';
import { StudioPageHeaderHeaderButton } from './StudioPageHeaderHeaderButton';
import {
  StudioPageHeaderProfileMenu,
  type StudioProfileMenuItem,
  type StudioProfileMenuGroup,
} from './StudioPageHeaderProfileMenu';
import { StudioPageHeaderCenter } from './StudioPageHeaderCenter';
import { StudioPageHeaderLeft } from './StudioPageHeaderLeft';
import { StudioPageHeaderMain } from './StudioPageHeaderMain';
import { StudioPageHeaderRight } from './StudioPageHeaderRight';
import { StudioPageHeaderSub } from './StudioPageHeaderSub';
import { StudioPageHeaderHeaderLink } from './StudioPageHeaderHeaderLink';
import { StudioPageHeaderPopoverTrigger } from './StudioPageHeaderPopoverTrigger';

type StudioPageHeaderComponent = typeof StudioPageHeaderParent & {
  Main: typeof StudioPageHeaderMain;
  Left: typeof StudioPageHeaderLeft;
  Center: typeof StudioPageHeaderCenter;
  Right: typeof StudioPageHeaderRight;
  PopoverTrigger: typeof StudioPageHeaderPopoverTrigger;
  Sub: typeof StudioPageHeaderSub;
  HeaderButton: typeof StudioPageHeaderHeaderButton;
  HeaderLink: typeof StudioPageHeaderHeaderLink;
  ProfileMenu: typeof StudioPageHeaderProfileMenu;
};

/**
 * @deprecated Use `StudioPageHeader` from `@studio/components` instead.
 */
const StudioPageHeader = StudioPageHeaderParent as StudioPageHeaderComponent;

StudioPageHeader.Main = StudioPageHeaderMain;
StudioPageHeader.Left = StudioPageHeaderLeft;
StudioPageHeader.Center = StudioPageHeaderCenter;
StudioPageHeader.Right = StudioPageHeaderRight;
StudioPageHeader.PopoverTrigger = StudioPageHeaderPopoverTrigger;
StudioPageHeader.Sub = StudioPageHeaderSub;
StudioPageHeader.HeaderButton = StudioPageHeaderHeaderButton;
StudioPageHeader.HeaderLink = StudioPageHeaderHeaderLink;
StudioPageHeader.ProfileMenu = StudioPageHeaderProfileMenu;

export {
  StudioPageHeader,
  type StudioPageHeaderProps,
  type StudioProfileMenuGroup,
  type StudioProfileMenuItem,
};

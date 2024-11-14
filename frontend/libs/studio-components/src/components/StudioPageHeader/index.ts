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

type StudioPageHeaderComponent = typeof StudioPageHeaderParent & {
  Main: typeof StudioPageHeaderMain;
  Left: typeof StudioPageHeaderLeft;
  Center: typeof StudioPageHeaderCenter;
  Right: typeof StudioPageHeaderRight;
  Sub: typeof StudioPageHeaderSub;
  HeaderButton: typeof StudioPageHeaderHeaderButton;
  HeaderLink: typeof StudioPageHeaderHeaderLink;
  ProfileMenu: typeof StudioPageHeaderProfileMenu;
};

const StudioPageHeader = StudioPageHeaderParent as StudioPageHeaderComponent;

StudioPageHeader.Main = StudioPageHeaderMain;
StudioPageHeader.Left = StudioPageHeaderLeft;
StudioPageHeader.Center = StudioPageHeaderCenter;
StudioPageHeader.Right = StudioPageHeaderRight;
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

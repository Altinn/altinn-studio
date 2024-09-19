import {
  StudioPageHeader as StudioPageHeaderParent,
  type StudioPageHeaderProps,
} from './StudioPageHeader';
import { StudioPageHeaderButton } from './StudioPageHeaderButton';
import { StudioPageHeaderCenter } from './StudioPageHeaderCenter';
import { StudioPageHeaderLeft } from './StudioPageHeaderLeft';
import { StudioPageHeaderMain } from './StudioPageHeaderMain';
import { StudioPageHeaderRight } from './StudioPageHeaderRight';
import { StudioPageHeaderSub } from './StudioPageHeaderSub';

type StudioPageHeaderComponent = typeof StudioPageHeaderParent & {
  Main: typeof StudioPageHeaderMain;
  Left: typeof StudioPageHeaderLeft;
  Center: typeof StudioPageHeaderCenter;
  Right: typeof StudioPageHeaderRight;
  Sub: typeof StudioPageHeaderSub;
};

const StudioPageHeader = StudioPageHeaderParent as StudioPageHeaderComponent;

StudioPageHeader.Main = StudioPageHeaderMain;
StudioPageHeader.Left = StudioPageHeaderLeft;
StudioPageHeader.Center = StudioPageHeaderCenter;
StudioPageHeader.Right = StudioPageHeaderRight;
StudioPageHeader.Sub = StudioPageHeaderSub;

export { StudioPageHeader, type StudioPageHeaderProps, StudioPageHeaderButton };

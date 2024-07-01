import {
  StudioPageHeader as StudioPageHeaderParent,
  StudioPageHeaderCenter,
  StudioPageHeaderLeft,
  StudioPageHeaderMain,
  StudioPageHeaderRight,
  StudioPageHeaderSub,
} from './StudioPageHeader';

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

export { StudioPageHeader };

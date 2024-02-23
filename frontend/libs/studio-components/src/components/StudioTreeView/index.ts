import { StudioTreeViewRoot, type StudioTreeViewRootProps } from './StudioTreeViewRoot';
import { StudioTreeViewItem, type StudioTreeViewItemProps } from './StudioTreeViewItem';

type StudioTreeViewComponent = {
  Root: typeof StudioTreeViewRoot;
  Item: typeof StudioTreeViewItem;
};

export const StudioTreeView: StudioTreeViewComponent = {
  Root: StudioTreeViewRoot,
  Item: StudioTreeViewItem,
};

export type { StudioTreeViewRootProps, StudioTreeViewItemProps };

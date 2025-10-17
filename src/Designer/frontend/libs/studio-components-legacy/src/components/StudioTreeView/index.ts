import { StudioTreeViewRoot } from './StudioTreeViewRoot';
import type { StudioTreeViewRootProps } from './StudioTreeViewRoot';
import { StudioTreeViewItem } from './StudioTreeViewItem';
import type { StudioTreeViewItemProps } from './StudioTreeViewItem';

type StudioTreeViewComponent = {
  Root: typeof StudioTreeViewRoot;
  Item: typeof StudioTreeViewItem;
};

/**
 * @deprecated Use `StudioTreeView` from `studio-components` instead.
 */
export const StudioTreeView: StudioTreeViewComponent = {
  Root: StudioTreeViewRoot,
  Item: StudioTreeViewItem,
};

export type { StudioTreeViewRootProps, StudioTreeViewItemProps };

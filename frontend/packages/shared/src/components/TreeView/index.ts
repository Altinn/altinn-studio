import { TreeViewRoot } from './TreeViewRoot';
import type { TreeViewRootProps, TreeViewRootRef } from './TreeViewRoot';
import { TreeViewItem } from './TreeViewItem';
import type { TreeViewItemProps } from './TreeViewItem';

type TreeViewComponent = {
  Root: typeof TreeViewRoot;
  Item: typeof TreeViewItem;
};

export const TreeView: TreeViewComponent = {
  Root: TreeViewRoot,
  Item: TreeViewItem,
};

export type { TreeViewRootProps, TreeViewRootRef, TreeViewItemProps };

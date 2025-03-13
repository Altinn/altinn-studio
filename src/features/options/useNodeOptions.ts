import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { CompWithBehavior } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const useNodeOptions = (node: LayoutNode<CompWithBehavior<'canHaveOptions'>> | string | undefined) =>
  NodesInternal.useNodeOptions(node);

export const useNodeOptionsSelector = () => NodesInternal.useNodeOptionsSelector();

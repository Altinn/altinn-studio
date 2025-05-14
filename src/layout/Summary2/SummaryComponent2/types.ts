import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface Summary2Props<T extends CompTypes> {
  target: LayoutNode<T>;
}

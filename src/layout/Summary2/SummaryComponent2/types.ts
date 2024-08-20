import type { CompInternal, CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface Summary2Props<T extends CompTypes> {
  target: LayoutNode<T>;
  overrides: CompInternal<'Summary2'>['overrides'] | undefined;
  isCompact: boolean | undefined;
}

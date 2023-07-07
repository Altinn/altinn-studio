import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompBase } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type Base = ILayoutCompBase<'ButtonGroup'>;

export interface ILayoutCompButtonGroupInHierarchy extends ExprResolved<Base> {
  childComponents: LayoutNode[];
}

export interface ILayoutCompButtonGroup extends Base {
  children: string[];
}

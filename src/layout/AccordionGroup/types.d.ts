import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompBase } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type ILayoutAccordionGroup = ILayoutCompBase<'AccordionGroup'> & {
  children: string[];
};

export type IAccordionGroup = Omit<ExprResolved<ILayoutAccordionGroup>, 'children'> & {
  childComponents: LayoutNode[];
};

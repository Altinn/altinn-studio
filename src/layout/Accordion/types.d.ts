import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompBase } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type ILayoutAccordion = ILayoutCompBase<'Accordion'> & {
  children: string[];
};

export type IAccordion = Omit<ExprResolved<ILayoutAccordion>, 'children'> & {
  childComponents: LayoutNode[];
  renderAsAccordionItem: boolean;
};

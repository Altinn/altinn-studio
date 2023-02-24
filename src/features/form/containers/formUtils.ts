import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup, ILayout } from 'src/layout/layout';

/**
 * @deprecated Prefer to use the layout hierarchy instead
 * @see useExprContext
 * @see useResolvedNode
 * @see ResolvedNodesSelector
 */
export const mapGroupComponents = (
  { children, edit }: ExprUnresolved<ILayoutGroup>,
  layout: ILayout | undefined | null,
) =>
  children
    .map((child) => {
      const childId = (edit?.multiPage && child.split(':')[1]) || child;
      return layout && layout.find((c) => c.id === childId);
    })
    .filter((c) => c !== undefined && c !== null) as ExprUnresolved<ComponentInGroup>[];

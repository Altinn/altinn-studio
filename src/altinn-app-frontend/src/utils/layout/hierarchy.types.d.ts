import type { ExprResolved } from 'src/features/expressions/types';
import type {
  IDataModelBindings,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import type { LayoutNode, LayoutRootNode } from 'src/utils/layout/hierarchy';

export type NodeType =
  // Plain/unresolved nodes include (unresolved) expressions
  | 'unresolved'
  // Resolved nodes have their expressions resolved, leaving only the results
  | 'resolved';

export type ComponentOf<NT extends NodeType> = NT extends 'unresolved'
  ? ILayoutComponent
  : ExprResolved<ILayoutComponent>;

export type GroupOf<NT extends NodeType> = NT extends 'unresolved'
  ? ILayoutGroup
  : ExprResolved<ILayoutGroup>;

export type LayoutGroupHierarchy<NT extends NodeType = 'unresolved'> = Omit<
  GroupOf<NT>,
  'children'
> & {
  childComponents: (ComponentOf<NT> | LayoutGroupHierarchy<NT>)[];
};

export interface RepeatingGroupExtensions {
  baseDataModelBindings?: IDataModelBindings;
}

export type RepeatingGroupLayoutComponent<NT extends NodeType = 'unresolved'> =
  RepeatingGroupExtensions & ComponentOf<NT>;

export type RepeatingGroupHierarchy<NT extends NodeType = 'unresolved'> = Omit<
  LayoutGroupHierarchy<NT>,
  'childComponents' | 'children'
> &
  RepeatingGroupExtensions & {
    rows: HierarchyWithRowsChildren<NT>[][];
  };

/**
 * Types of possible components on the top level of a repeating group hierarchy with rows
 */
export type HierarchyWithRows<NT extends NodeType = 'unresolved'> =
  | ComponentOf<NT>
  | LayoutGroupHierarchy<NT> // Non-repeating groups
  | RepeatingGroupHierarchy<NT>;

/**
 * Types of possible components inside rows. Note that no unresolved 'ILayoutComponent' is valid here,
 * as all components inside repeating group rows needs to have a baseComponentId, etc.
 */
export type HierarchyWithRowsChildren<NT extends NodeType = 'unresolved'> =
  | RepeatingGroupLayoutComponent<NT>
  | LayoutGroupHierarchy<NT> // Non-repeating groups
  | RepeatingGroupHierarchy<NT>;

export type AnyItem<NT extends NodeType = 'unresolved'> =
  | ComponentOf<NT>
  | GroupOf<NT>
  | RepeatingGroupLayoutComponent<NT>
  | LayoutGroupHierarchy<NT>
  | RepeatingGroupHierarchy<NT>;

export type AnyNode<NT extends NodeType = 'unresolved'> = LayoutNode<
  NT,
  AnyItem<NT>
>;

export type AnyParentItem<NT extends NodeType = 'unresolved'> = Exclude<
  AnyItem<NT>,
  ComponentOf<NT> | GroupOf<NT> | RepeatingGroupLayoutComponent<NT>
>;

export type AnyParentNode<NT extends NodeType = 'unresolved'> =
  | LayoutNode<NT>
  | LayoutRootNode<NT>;

export type AnyTopLevelItem<NT extends NodeType> = Exclude<
  AnyItem<NT>,
  GroupOf<NT>
>;

export type AnyTopLevelNode<NT extends NodeType> = LayoutNode<
  NT,
  AnyTopLevelItem<NT>
>;

export type AnyChildNode<NT extends NodeType> = LayoutNode<NT, AnyItem<NT>>;

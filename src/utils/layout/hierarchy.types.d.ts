import type { $Keys, DeepPartial, PickByValue } from 'utility-types';

import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ComponentClassMapTypes } from 'src/layout';
import type { GridComponent, GridRow, ILayoutGridHierarchy } from 'src/layout/Grid/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type {
  ComponentExceptGroup,
  ComponentTypes,
  IDataModelBindings,
  ILayoutComponent,
  ILayoutComponentExact,
} from 'src/layout/layout';
import type { ComponentType } from 'src/layout/LayoutComponent';
import type { IValidations } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

/**
 * In the hierarchy, components and groups will always have their layout expressions evaluated and resolved.
 */
export type HComponent<T extends ComponentExceptGroup = ComponentExceptGroup> = T extends 'Grid'
  ? ILayoutGridHierarchy
  : ExprResolved<ILayoutComponentExact<T>>;

/**
 * Base type used for repeating group and non-repeating groups
 */
type HGroup = Omit<ExprResolved<ILayoutGroup>, 'children' | 'rowsBefore' | 'rowsAfter'> & {
  rowsBefore?: GridRow<GridComponent>[];
  rowsAfter?: GridRow<GridComponent>[];
};

/**
 * Definition of a non-repeating group inside a hierarchy structure
 */
export type HNonRepGroup = HGroup & {
  childComponents: LayoutNode<HComponent | HGroups>[];
};

/**
 * Extended attributes for components defined inside repeating group rows
 */
export interface HRepGroupExtensions {
  baseDataModelBindings?: IDataModelBindings;
  multiPageIndex?: number;
}

/**
 * A component inside a repeating group (it has some extensions)
 */
export type HComponentInRepGroup<T extends ComponentExceptGroup = ComponentExceptGroup> = HComponent<T> &
  HRepGroupExtensions;

/**
 * A row object for a repeating group
 */
export type HRepGroupRow = {
  index: number;
  items: LayoutNode<HRepGroupChild>[];

  // If this object is present, it contains a subset of the Group layout object, where some expressions may be resolved
  // in the context of the current repeating group row.
  groupExpressions?: DeepPartial<ExprResolved<ILayoutGroup>>;
};

/**
 * Definition of a repeating group component inside a hierarchy structure
 */
export type HRepGroup = HGroup &
  HRepGroupExtensions & {
    rows: (HRepGroupRow | undefined)[];
  };

/**
 * Types of possible components inside repeating group rows
 */
export type HRepGroupChild = (HComponent | HNonRepGroup | HRepGroup) & HRepGroupExtensions;

/**
 * Any parent object of a LayoutNode (with for example repeating groups, the parent can be the group node, but above
 * that there will be a LayoutPage).
 */
export type ParentNode = LayoutNode | LayoutPage;

export type HGroups = HNonRepGroup | HRepGroup;

/**
 * Any item inside a hierarchy. Note that a LayoutNode _contains_ an item. The LayoutNode itself is an instance of the
 * LayoutNode class, while _an item_ is the object inside it that is somewhat similar to layout objects.
 */
export type AnyItem<T extends ComponentTypes = ComponentTypes> = T extends 'Group'
  ? HGroups
  : T extends ComponentExceptGroup
  ? HComponent<T> | HComponentInRepGroup<T>
  : HComponent | HComponentInRepGroup | HGroups;

export type TypeFromAnyItem<T extends AnyItem> = T extends AnyItem<infer Type> ? Type : ComponentTypes;

export interface HierarchyDataSources extends ContextDataSources {
  validations: IValidations;
}

export type LayoutNodeFromType<Type> = Type extends 'Grid'
  ? LayoutNode<ILayoutGridHierarchy>
  : Type extends ComponentExceptGroup
  ? LayoutNode<HComponent<Type> | HComponentInRepGroup<Type>, Type>
  : Type extends 'Group'
  ? LayoutNode<HGroups, 'Group'>
  : LayoutNode;

export type LayoutNodeFromObj<T> = T extends ILayoutComponent
  ? T extends { type: infer Type }
    ? LayoutNodeFromType<Type>
    : LayoutNode
  : LayoutNode;

export type TypesFromType<Type extends ComponentType> = $Keys<PickByValue<ComponentClassMapTypes, Type>>;

export type LayoutNodeFromComponentType<Type> = Type extends ComponentType
  ? LayoutNodeFromType<TypesFromType<Type>>
  : LayoutNode;

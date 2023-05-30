import type { $Keys, PickByValue } from 'utility-types';

import type { IDevToolsState } from 'src/features/devtools/data/types';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ComponentClassMapTypes } from 'src/layout';
import type { ComponentTypeConfigs } from 'src/layout/components';
import type { ComponentExceptGroup, ComponentTypes, IDataModelBindings, ILayoutComponent } from 'src/layout/layout';
import type { ComponentType } from 'src/layout/LayoutComponent';
import type { IValidations } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

/**
 * These keys are not defined anywhere in the actual form layout files, but are added by the hierarchy.
 */
interface HierarchyExtensions {
  // These will be set if the component is inside a repeating group
  baseComponentId?: string;
  baseDataModelBindings?: IDataModelBindings;
  multiPageIndex?: number;
}

/**
 * In the hierarchy, components and groups will always have their layout expressions evaluated and resolved.
 */
export type HComponent<T extends ComponentExceptGroup = ComponentExceptGroup> = AnyItem<T>;

/**
 * Any item inside a hierarchy. Note that a LayoutNode _contains_ an item. The LayoutNode itself is an instance of the
 * LayoutNode class, while _an item_ is the object inside it that is somewhat similar to layout objects.
 */
export type AnyItem<T extends ComponentTypes = ComponentTypes> = ComponentTypeConfigs[T]['nodeItem'] &
  HierarchyExtensions;

/**
 * Any parent object of a LayoutNode (with for example repeating groups, the parent can be the group node, but above
 * that there will be a LayoutPage).
 */
export type ParentNode = LayoutNode | LayoutPage;

export type TypeFromAnyItem<T extends AnyItem> = T extends { type: infer Type }
  ? Type extends ComponentTypes
    ? Type
    : ComponentTypes
  : ComponentTypes;

export interface HierarchyDataSources extends ContextDataSources {
  validations: IValidations;
  devTools: IDevToolsState;
}

export type LayoutNodeFromType<Type> = Type extends ComponentTypes ? LayoutNode<AnyItem<Type>, Type> : LayoutNode;

export type LayoutNodeFromObj<T> = T extends ILayoutComponent
  ? T extends { type: infer Type }
    ? LayoutNodeFromType<Type>
    : LayoutNode
  : LayoutNode;

export type TypesFromType<Type extends ComponentType> = $Keys<PickByValue<ComponentClassMapTypes, Type>>;

export type LayoutNodeFromComponentType<Type> = Type extends ComponentType
  ? LayoutNodeFromType<TypesFromType<Type>>
  : LayoutNode;

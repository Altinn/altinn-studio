import type { $Keys, PickByValue } from 'utility-types';

import type { IDevToolsState } from 'src/features/devtools/data/types';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { CompCategory } from 'src/layout/common';
import type { ComponentConfigs, ComponentTypeConfigs } from 'src/layout/components.generated';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { CompClassMapTypes } from 'src/layout/index';
import type {
  ActionComponent,
  ContainerComponent,
  FormComponent,
  PresentationComponent,
} from 'src/layout/LayoutComponent';
import type { IValidations } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

export interface ILayouts {
  [id: string]: ILayout | undefined;
}

/**
 * This interface type defines all the possible components, along with their 'type' key and associated layout
 * definition. If you want to reference a particular component layout type you can either reference the individual
 * type (ex. ILayoutCompTextArea), or ILayoutComponent<'TextArea'>.
 */

export type CompTypes = keyof typeof ComponentConfigs & keyof ComponentTypeConfigs;
type AllComponents = ComponentTypeConfigs[CompTypes]['layout'];

export type CompExceptGroup = Exclude<CompTypes, 'Group'>;

/**
 * This type can be used to reference the layout declaration for a component. You can either use it to specify
 * any valid component:
 *
 *  const myComponent:CompExternal = ...
 *
 * Or a component of a specific known type (gives you more valid options):
 *
 *  const myImageComponent:CompExternal<'Image'> = ...
 *
 * @see CompInternal
 * @see LayoutNode
 */
export type CompExternal<Type extends CompExceptGroup = CompExceptGroup> = Extract<AllComponents, { type: Type }>;

/**
 * Alternative version of the one above
 */
export type CompExternalExact<Type extends CompTypes> = ComponentTypeConfigs[Type]['layout'];

export type CompOrGroupExternal = CompGroupExternal | CompExternal;

export type CompRendersLabel<T extends CompTypes> = (typeof ComponentConfigs)[T]['rendersWithLabel'];

/**
 * This is the type you should use when referencing a specific component type, and will give
 * you the correct data model bindings for that component.
 */
export type IDataModelBindings<T extends CompTypes = CompTypes> =
  ComponentTypeConfigs[T]['nodeItem']['dataModelBindings'];

export type ITextResourceBindings<T extends CompTypes = CompTypes> =
  ComponentTypeConfigs[T]['nodeItem']['textResourceBindings'];

export type ILayout = CompOrGroupExternal[];

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
 * Any item inside a hierarchy. Note that a LayoutNode _contains_ an item. The LayoutNode itself is an instance of the
 * LayoutNode class, while _an item_ is the object inside it that is somewhat similar to layout objects.
 */
type NodeItem<T extends CompTypes> = ComponentTypeConfigs[T]['nodeItem'];

export type CompInternal<T extends CompTypes = CompTypes> = NodeItem<T> & HierarchyExtensions;

/**
 * Any parent object of a LayoutNode (with for example repeating groups, the parent can be the group node, but above
 * that there will be a LayoutPage).
 */
export type ParentNode = LayoutNode | LayoutPage;

export type TypeFromConfig<T extends CompInternal | CompExternal> = T extends { type: infer Type }
  ? Type extends CompTypes
    ? Type
    : CompTypes
  : CompTypes;

export interface HierarchyDataSources extends ContextDataSources {
  validations: IValidations;
  devTools: IDevToolsState;
}

export type LayoutNodeFromObj<T> = T extends { type: infer Type }
  ? Type extends CompTypes
    ? LayoutNode<Type>
    : LayoutNode
  : LayoutNode;

export type TypesFromCategory<Type extends CompCategory> = $Keys<PickByValue<CompClassMapTypes, Type>>;

export type DefFromCategory<C extends CompCategory> = C extends 'presentation'
  ? PresentationComponent<any>
  : C extends 'form'
  ? FormComponent<any>
  : C extends 'action'
  ? ActionComponent<any>
  : C extends 'container'
  ? ContainerComponent<any>
  : never;

export type LayoutNodeFromCategory<Type> = Type extends CompCategory
  ? LayoutNode<TypesFromCategory<Type>> & DefFromCategory<Type>
  : LayoutNode;

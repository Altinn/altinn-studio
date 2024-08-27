import type { $Keys, PickByValue } from 'utility-types';

import type { CompBehaviors, CompCapabilities } from 'src/codegen/Config';
import type { CompCategory } from 'src/layout/common';
import type { ILayoutFile } from 'src/layout/common.generated';
import type { ComponentTypeConfigs, getComponentConfigs } from 'src/layout/components.generated';
import type { CompClassMapCategories } from 'src/layout/index';
import type {
  ActionComponent,
  ContainerComponent,
  FormComponent,
  PresentationComponent,
} from 'src/layout/LayoutComponent';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

export interface ILayouts {
  [id: string]: ILayout | undefined;
}

/**
 * This interface type defines all the possible components, along with their 'type' key and associated layout
 * definition. If you want to reference a particular component layout type you can either reference the individual
 * type (ex. ILayoutCompTextArea), or ILayoutComponent<'TextArea'>.
 */

type ComponentConfigs = ReturnType<typeof getComponentConfigs>;
export type CompTypes = keyof ComponentConfigs & keyof ComponentTypeConfigs;
type AllComponents = ComponentTypeConfigs[CompTypes]['layout'];

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
export type CompExternal<Type extends CompTypes = CompTypes> = Extract<AllComponents, { type: Type }>;

/**
 * Alternative version of the one above
 */
export type CompExternalExact<Type extends CompTypes> = ComponentTypeConfigs[Type]['layout'];

/**
 * When running hierarchy generation, an intermediate type is used. This will contain the same properties as
 * CompExternal, but also the hierarchy extensions (as applied when running hierarchy mutations). At this point
 * the ID property will be set to `<baseId>-<rowIndex>` as expected for repeating groups, etc.
 */
export type CompIntermediate<Type extends CompTypes = CompTypes> = CompExternal<Type> & HierarchyExtensions;
export type CompIntermediateExact<Type extends CompTypes> = CompExternalExact<Type> & HierarchyExtensions;

/**
 * This is the type you should use when referencing a specific component type, and will give
 * you the correct data model bindings for that component.
 */
export type IDataModelBindings<T extends CompTypes = CompTypes> = Exclude<
  CompInternal<T>['dataModelBindings'],
  undefined
>;

export type ITextResourceBindingsExternal<T extends CompTypes = CompTypes> =
  ComponentTypeConfigs[T]['layout']['textResourceBindings'];

export type ITextResourceBindings<T extends CompTypes = CompTypes> = CompInternal<T>['textResourceBindings'];

export type ILayout = CompExternal[];

/**
 * These keys are not defined anywhere in the actual form layout files, but are added by the hierarchy.
 */
interface HierarchyExtensions {
  // These will be set if the component is inside a repeating group
  baseComponentId?: string;
  multiPageIndex?: number;
}

/**
 * Any item inside a hierarchy. Note that a LayoutNode _contains_ an item. The LayoutNode itself is an instance of the
 * LayoutNode class, while _an item_ is the object inside it that is somewhat similar to layout objects.
 */
type NodeItem<T extends CompTypes> = ReturnType<ComponentConfigs[T]['def']['evalExpressions']>;

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

export type TypeFromNode<N extends LayoutNode | undefined> = N extends undefined
  ? never
  : N extends BaseLayoutNode<infer Type>
    ? Type
    : CompTypes;

export type LayoutNodeFromObj<T> = T extends { type: infer Type }
  ? Type extends CompTypes
    ? LayoutNode<Type>
    : LayoutNode
  : LayoutNode;

export type TypesFromCategory<Cat extends CompCategory> = $Keys<PickByValue<CompClassMapCategories, Cat>>;

export type CompWithPlugin<Plugin> = {
  [Type in CompTypes]: Extract<ComponentTypeConfigs[Type]['plugins'], Plugin> extends never ? never : Type;
}[CompTypes];

export type DefFromCategory<C extends CompCategory> = C extends 'presentation'
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PresentationComponent<any>
  : C extends 'form'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      FormComponent<any>
    : C extends 'action'
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ActionComponent<any>
      : C extends 'container'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ContainerComponent<any>
        : never;

export type LayoutNodeFromCategory<Type> = Type extends CompCategory ? LayoutNode<TypesFromCategory<Type>> : LayoutNode;

export type ILayoutCollection = { [pageName: string]: ILayoutFile };

export type IsContainerComp<T extends CompTypes> = ComponentTypeConfigs[T]['category'] extends CompCategory.Container
  ? true
  : false;

export type IsActionComp<T extends CompTypes> = ComponentTypeConfigs[T]['category'] extends CompCategory.Action
  ? true
  : false;

export type IsFormComp<T extends CompTypes> = ComponentTypeConfigs[T]['category'] extends CompCategory.Form
  ? true
  : false;

export type IsPresentationComp<T extends CompTypes> =
  ComponentTypeConfigs[T]['category'] extends CompCategory.Presentation ? true : false;

export type CompWithCap<Capability extends keyof CompCapabilities> = {
  [Type in CompTypes]: ComponentConfigs[Type]['capabilities'][Capability] extends true ? Type : never;
}[CompTypes];

export type CompWithBehavior<Behavior extends keyof CompBehaviors> = {
  [Type in CompTypes]: ComponentConfigs[Type]['behaviors'][Behavior] extends true ? Type : never;
}[CompTypes];

export interface NodeValidationProps<T extends CompTypes> {
  node: LayoutNode<T>;
  externalItem: CompExternal<T>;
  intermediateItem: CompIntermediate<T>;
}

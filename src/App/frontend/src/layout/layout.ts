import type { $Keys, PickByValue } from 'utility-types';

import type { CompBehaviors } from 'src/codegen/Config';
import type { CompCategory } from 'src/layout/common';
import type { IDataModelReference, ILayoutFile } from 'src/layout/common.generated';
import type { ComponentTypeConfigs, getComponentConfigs } from 'src/layout/components.generated';
import type { CompClassMapCategories } from 'src/layout/index';

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
 */
export type CompExternal<Type extends CompTypes = CompTypes> = Extract<AllComponents, { type: Type }>;

/**
 * Alternative version of the one above
 */
export type CompExternalExact<Type extends CompTypes> = ComponentTypeConfigs[Type]['layout'];

/**
 * When running hierarchy generation, an intermediate type is used. This will contain the same properties as
 * CompExternal. At this point the ID property will be set to `<baseId>-<rowIndex>` as expected for
 * repeating groups, etc.
 */
export type CompIntermediate<Type extends CompTypes = CompTypes> = CompExternal<Type>;
export type CompIntermediateExact<Type extends CompTypes> = CompExternalExact<Type>;

/**
 * Gets the possible Summary2 overrides for a given component type
 */
export type CompSummaryOverrides<Type extends CompTypes = CompTypes> = ComponentTypeConfigs[Type]['summaryOverrides'];
export type CompSummaryOverridesWithRef<Type extends CompTypes = CompTypes> =
  ComponentTypeConfigs[Type]['summaryOverridesWithRef'];

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
 * The result of evaluating expressions for a component. This 'internal' item is what the layout configuration will
 * look like once every expression within it has been evaluated.
 */
export type CompInternal<T extends CompTypes = CompTypes> = ReturnType<ComponentConfigs[T]['def']['evalExpressions']>;

export type TypesFromCategory<Cat extends CompCategory> = $Keys<PickByValue<CompClassMapCategories, Cat>>;

export type CompWithPlugin<Plugin> = {
  [Type in CompTypes]: Extract<ComponentTypeConfigs[Type]['plugins'], Plugin> extends never ? never : Type;
}[CompTypes];

export type ILayoutCollection = { [pageName: string]: ILayoutFile };

export type CompWithBehavior<Behavior extends keyof CompBehaviors> = {
  [Type in CompTypes]: ComponentConfigs[Type]['behaviors'][Behavior] extends true ? Type : never;
}[CompTypes];

export type CompWithBinding<BindingKey extends string> = {
  [Type in CompTypes]: ComponentTypeConfigs[Type]['layout']['dataModelBindings'] extends {
    [key in BindingKey]?: IDataModelReference;
  }
    ? Type
    : never;
}[CompTypes];

export interface NodeValidationProps<T extends CompTypes> {
  externalItem: CompExternal<T>;
  intermediateItem: CompIntermediate<T>;
}

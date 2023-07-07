import type { TextField } from '@digdir/design-system-react';
import type { GridSize } from '@material-ui/core';
import type { UnionToIntersection } from 'utility-types';

import type { ExprUnresolved, ExprVal } from 'src/features/expressions/types';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { ComponentConfigs, ComponentTypeConfigs } from 'src/layout/components';
import type { ILayoutCompDropdown } from 'src/layout/Dropdown/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutCompLikert } from 'src/layout/Likert/types';
import type { ILayoutCompRadioButtons } from 'src/layout/RadioButtons/types';
import type { ILabelSettings, IMapping, IOption, IOptionSource, Triggers } from 'src/types';
import type { UnifyDMB, UnifyTRB } from 'src/utils/layout/hierarchy.types';

export interface ILayouts {
  [id: string]: ILayout | undefined;
}

export interface ILayoutEntry<T extends ComponentTypes = ComponentTypes> {
  id: string;
  type: T;
}

export interface ILayoutCompBase<Type extends ComponentTypes> extends ILayoutEntry<Type> {
  dataModelBindings?: IDataModelBindings<Type>;
  maxLength?: number;
  readOnly?: ExprVal.Boolean;
  renderAsSummary?: ExprVal.Boolean;
  required?: ExprVal.Boolean;
  hidden?: ExprVal.Boolean;
  textResourceBindings?: UnionToIntersection<TRBAsMap<Type, ExprVal.String>>;
  grid?: IGrid;
  triggers?: Triggers[];
  labelSettings?: ILabelSettings;
  pageBreak?: IPageBreak;
}

interface ILayoutCompWillBeSavedWhileTyping {
  saveWhileTyping?: boolean | number;
}

interface ISelectionComponent {
  options?: IOption[];
  optionsId?: string;
  mapping?: IMapping;
  secure?: boolean;
  source?: IOptionSource;
  preselectedOptionIndex?: number;
}

export type NumberFormatProps = Exclude<Parameters<typeof TextField>[0]['formatting'], undefined>['number'];

/**
 * Number formatting options. Will be reduced to react-number-format options:
 * @see useMapToReactNumberConfig
 */
export interface IInputFormatting {
  // Newer Intl.NumberFormat options
  currency?: string;
  unit?: string;
  position?: 'prefix' | 'suffix';

  // Older options based on react-number-format
  number?: NumberFormatProps;
  align?: 'right' | 'center' | 'left';
}

export interface ITableColumnFormatting<T extends ITableColumnProperties = ITableColumnProperties> {
  [key: string]: T;
}

export interface ITableColumnProperties {
  width?: string;
  alignText?: 'left' | 'center' | 'right';
  textOverflow?: {
    lineWrap?: boolean;
    maxHeight?: number;
  };
}

/**
 * This interface type defines all the possible components, along with their 'type' key and associated layout
 * definition. If you want to reference a particular component layout type you can either reference the individual
 * type (ex. ILayoutCompTextArea), or ILayoutComponent<'TextArea'>.
 */

export type ComponentTypes = keyof typeof ComponentConfigs & keyof ComponentTypeConfigs;
type AllComponents = ComponentTypeConfigs[ComponentTypes]['layout'];

export type ComponentExceptGroup = Exclude<ComponentTypes, 'Group'>;
export type ComponentInGroup = ILayoutComponent | ILayoutGroup;

/**
 * This type can be used to reference the layout declaration for a component. You can either use it to specify
 * any valid component:
 *
 *  const myComponent:ILayoutComponent = ...
 *
 * Or a component of a specific known type (gives you more valid options):
 *
 *  const myImageComponent:ILayoutComponent<'Image'> = ...
 *
 * @deprecated
 * @see AnyItem
 * @see LayoutNode
 */
export type ILayoutComponent<Type extends ComponentExceptGroup = ComponentExceptGroup> = UnifyDMB<
  UnifyTRB<Extract<AllComponents, { type: Type }>>
>;

/**
 * Alternative version of the one above
 */
export type ILayoutComponentExact<Type extends ComponentTypes> = UnifyDMB<
  UnifyTRB<ComponentTypeConfigs[Type]['layout']>
>;

export type ILayoutComponentOrGroup = ILayoutGroup | ILayoutComponent;

export type ComponentRendersLabel<T extends ComponentTypes> = (typeof ComponentConfigs)[T]['rendersWithLabel'];

export interface IDataModelBindingsSimple {
  simpleBinding?: string;
}

/**
 * A middle ground between group and simple bindings, a list binding can be used to
 * store a list of primitive values, like string[].
 */
export interface IDataModelBindingsList {
  list?: string;
}

type InnerDMB<T extends ComponentTypes> = ComponentTypeConfigs[T]['validDataModelBindings'];

/**
 * This is the type you should use when referencing a specific component type, and will give
 * you the correct data model bindings for that component.
 */
export type IDataModelBindings<T extends ComponentTypes = ComponentTypes> =
  | UnionToIntersection<Exclude<InnerDMB<T>, undefined>>
  | undefined;

type InnerTRB<T extends ComponentTypes> = ComponentRendersLabel<T> extends true
  ? ComponentTypeConfigs[T]['validTextResourceBindings'] | TextBindingsForLabel
  : ComponentTypeConfigs[T]['validTextResourceBindings'];

type TRBAsUnion<T extends ComponentTypes> = Exclude<InnerTRB<T>, undefined> extends never
  ? undefined
  : Exclude<InnerTRB<T>, undefined>;

type TRBAsMap<T extends ComponentTypes, V> = {
  [Binding in TRBAsUnion<T>]?: V;
};

export type ITextResourceBindings<T extends ComponentTypes = ComponentTypes> =
  | UnionToIntersection<TRBAsMap<T, string>>
  | undefined;

export type TextBindingsForSummarizableComponents = 'summaryTitle' | 'summaryDescription' | 'summaryAccessibleTitle';
export type TextBindingsForFormComponents = TextBindingsForSummarizableComponents | 'tableTitle' | 'shortName';
export type TextBindingsForLabel = 'title' | 'description' | 'help';

export type ILayout = ExprUnresolved<ILayoutComponentOrGroup>[];

export type ISelectionComponentProps =
  | ILayoutCompRadioButtons
  | ILayoutCompCheckboxes
  | ILayoutCompLikert
  | ILayoutCompDropdown;

export interface IGrid extends IGridStyling {
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
}

export interface IGridStyling {
  xs?: GridSize;
  sm?: GridSize;
  md?: GridSize;
  lg?: GridSize;
  xl?: GridSize;
}

export interface IPageBreak {
  breakBefore?: ExprVal.String; // 'auto' | 'always' | 'avoid'
  breakAfter?: ExprVal.String; // 'auto' | 'always' | 'avoid'
}

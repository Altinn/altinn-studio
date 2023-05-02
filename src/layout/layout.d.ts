import type { TextField } from '@digdir/design-system-react';
import type { GridSize } from '@material-ui/core';

import type { ExprUnresolved, ExprVal } from 'src/features/expressions/types';
import type { ILayoutCompActionButton } from 'src/layout/ActionButton/types';
import type { IDataModelBindingsForAddress, ILayoutCompAddress } from 'src/layout/Address/types';
import type { ILayoutCompAttachmentList } from 'src/layout/AttachmentList/types';
import type { ILayoutCompButton } from 'src/layout/Button/types';
import type { ILayoutCompButtonGroup } from 'src/layout/ButtonGroup/types';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { ILayoutCompCustom } from 'src/layout/Custom/types';
import type { ILayoutCompDatepicker } from 'src/layout/Datepicker/types';
import type { ILayoutCompDropdown } from 'src/layout/Dropdown/types';
import type { ILayoutCompFileUpload } from 'src/layout/FileUpload/types';
import type { ILayoutCompFileUploadWithTag } from 'src/layout/FileUploadWithTag/types';
import type { ILayoutCompGrid } from 'src/layout/Grid/types';
import type { IDataModelBindingsForGroup, ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutCompHeader } from 'src/layout/Header/types';
import type { ILayoutCompImage } from 'src/layout/Image/types';
import type { ILayoutCompInput } from 'src/layout/Input/types';
import type { ILayoutCompInstanceInformation } from 'src/layout/InstanceInformation/types';
import type { ILayoutCompInstantiationButton } from 'src/layout/InstantiationButton/types';
import type { ILayoutCompLikert } from 'src/layout/Likert/types';
import type { IDataModelBindingsForList, ILayoutCompList } from 'src/layout/List/types';
import type { ILayoutCompMap } from 'src/layout/Map/types';
import type { ILayoutCompMultipleSelect } from 'src/layout/MultipleSelect/types';
import type { ILayoutCompNavBar } from 'src/layout/NavigationBar/types';
import type { ILayoutCompNavButtons } from 'src/layout/NavigationButtons/types';
import type { ILayoutCompPanel } from 'src/layout/Panel/types';
import type { ILayoutCompParagraph } from 'src/layout/Paragraph/types';
import type { ILayoutCompPrintButton } from 'src/layout/PrintButton/types';
import type { ILayoutCompRadioButtons } from 'src/layout/RadioButtons/types';
import type { ILayoutCompSummary } from 'src/layout/Summary/types';
import type { ILayoutCompTextArea } from 'src/layout/TextArea/types';
import type { ILabelSettings, IMapping, IOption, IOptionSource, LayoutStyle, Triggers } from 'src/types';

export interface ILayouts {
  [id: string]: ILayout | undefined;
}

/**
 * These keys are not defined anywhere in the actual form layout files, but have been snuck in here for convenience at
 * some point. They should instead be moved to IComponentProps or somewhere else, as they are computed values set in
 * app-frontend at some point, and not something the server-side sends us. Leaving them here as typings break without
 * them, but exposing them in a separate interface in order to make it clear these are on shaky ground.
 */
interface NotInLayout {
  baseComponentId?: string;
  disabled?: boolean;
}

export interface ILayoutEntry<T extends ComponentTypes = ComponentTypes> extends NotInLayout {
  id: string;
  type: T;
}

export interface ILayoutCompBase<Type extends ComponentTypes = ComponentTypes> extends ILayoutEntry<Type> {
  dataModelBindings?: IDataModelBindings;
  readOnly?: ExprVal.Boolean;
  required?: ExprVal.Boolean;
  hidden?: ExprVal.Boolean;
  textResourceBindings?: ITextResourceBindings;
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

export interface IComponentRadioOrCheckbox<T extends Extract<ComponentTypes, 'RadioButtons' | 'Checkboxes' | 'Likert'>>
  extends ILayoutCompBase<T>,
    ISelectionComponent {
  layout?: LayoutStyle;
}

export type NumberFormatProps = Exclude<Parameters<typeof TextField>[0]['formatting'], undefined>['number'];

export interface IInputFormatting {
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
interface Map {
  ActionButton: ILayoutCompActionButton;
  AddressComponent: ILayoutCompAddress;
  AttachmentList: ILayoutCompAttachmentList;
  Button: ILayoutCompButton;
  ButtonGroup: ILayoutCompButtonGroup;
  Checkboxes: ILayoutCompCheckboxes;
  Custom: ILayoutCompCustom;
  Datepicker: ILayoutCompDatepicker;
  Dropdown: ILayoutCompDropdown;
  FileUpload: ILayoutCompFileUpload;
  FileUploadWithTag: ILayoutCompFileUploadWithTag;
  Grid: ILayoutCompGrid;
  Group: ILayoutGroup;
  Header: ILayoutCompHeader;
  Image: ILayoutCompImage;
  Input: ILayoutCompInput;
  InstantiationButton: ILayoutCompInstantiationButton;
  InstanceInformation: ILayoutCompInstanceInformation;
  Likert: ILayoutCompLikert;
  List: ILayoutCompList;
  Map: ILayoutCompMap;
  MultipleSelect: ILayoutCompMultipleSelect;
  NavigationBar: ILayoutCompNavBar;
  NavigationButtons: ILayoutCompNavButtons;
  Panel: ILayoutCompPanel;
  Paragraph: ILayoutCompParagraph;
  PrintButton: ILayoutCompPrintButton;
  RadioButtons: ILayoutCompRadioButtons;
  Summary: ILayoutCompSummary;
  TextArea: ILayoutCompTextArea;
}

export type ComponentTypes = keyof Map;
type AllComponents = Map[ComponentTypes];

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
export type ILayoutComponent<Type extends ComponentExceptGroup = ComponentExceptGroup> = Extract<
  AllComponents,
  { type: Type }
>;

/**
 * Alternative version of the one above
 */
export type ILayoutComponentExact<Type extends ComponentTypes> = Map[Type];

export type ILayoutComponentOrGroup = ILayoutGroup | ILayoutComponent;

export interface IDataModelBindingsSimple {
  simpleBinding: string;
}

/**
 * A middle ground between group and simple bindings, a list binding can be used to
 * store a list of primitive values, like string[].
 */
export interface IDataModelBindingsList {
  list: string;
}

export type IDataModelBindings =
  | (Partial<IDataModelBindingsSimple> &
      Partial<IDataModelBindingsList> &
      Partial<IDataModelBindingsForGroup> &
      Partial<IDataModelBindingsForAddress>)
  | IDataModelBindingsForList;

export interface ITextResourceBindings {
  [id: string]: ExprVal.String | undefined;
}

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

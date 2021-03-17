import { GridSize } from '@material-ui/core';
import { IOption, Triggers } from '../../../types';

export interface ILayouts {
  [id: string]: ILayout;
}

export interface ILayoutEntry {
  id: string;
  type?: string;
}

export interface ILayoutGroup extends ILayoutEntry {
  children: string[];
  dataModelBindings?: IDataModelBindings;
  maxCount: number;
  textResourceBindings?: ITextResourceBindings;
  tableHeaders?: string[];
  edit?: IGroupEditProperties;
}

export interface ILayoutBaseComponent extends ILayoutEntry {
  type: string;
  dataModelBindings: IDataModelBindings;
  isValid?: boolean;
  readOnly: boolean;
  disabled?: boolean;
  required: boolean;
  textResourceBindings: ITextResourceBindings;
  triggers?: Triggers[];
  formData?: any;
  grid?: IGrid;
}

export type ILayoutComponent = ILayoutBaseComponent
  | ISelectionComponentProps
  | IDatepickerProps
  | IFileuploadProps
  | IHeaderProps
  | IInputProps
  | INavigationButtonProps
  | IParagraphProps
  | IRadioButtonsProps
  | IAdressComponent
  | ITextAreaProps

export interface IDataModelBindings {
  [id: string]: string;
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export type ILayout = Array<ILayoutComponent | ILayoutGroup>;

export interface ISelectionComponentProps extends ILayoutBaseComponent {
  options?: IOption[];
  optionsId?: string;
}

export interface IDatepickerProps extends ILayoutBaseComponent { }

export interface IFileuploadProps extends ILayoutBaseComponent {
  maxNumberOfAttachments: number;
  maxFileSizeInMB: number;
  displayMode: any;
  hasCustomFileEndings: boolean;
  validFileEndings: any;
}

export interface IGrid extends IGridStyling {
  innerGrid?: IGridStyling;
}

export interface IGridStyling {
  xs?: GridSize;
  sm?: GridSize;
  md?: GridSize;
  lg?: GridSize;
  xl?: GridSize;
}

declare enum HeaderSize {
  S,
  M,
  L,
}

export interface IHeaderProps extends ILayoutBaseComponent {
  size: HeaderSize;
}

declare enum InputFieldType {
  text,
  email,
  password,
}

export interface IInputProps extends ILayoutBaseComponent {
  inputType: InputFieldType;
}

export interface INavigationButtonProps extends ILayoutBaseComponent {
  next?: string;
  previous?: string;
}

export interface IParagraphProps extends ILayoutBaseComponent { }

export interface IRadioButtonsProps extends ILayoutBaseComponent {
  options: IOption[];
  preselectedOptionIndex: number;
}

export interface ITextAreaProps extends ILayoutBaseComponent { }

export interface IAdressComponent extends ILayoutBaseComponent {
  addressTextResourceBinding: string;
  areaCodeTextResourceBinding: string;
  coTextResourceBinding: string;
  simpleDisplayMode: boolean;
}

export interface IGroupEditProperties {
  mode?: 'hideTable' | 'showTable' | 'showAll';
  rules?: any[];
  saveButton?: boolean;
  deleteButton?: boolean;
}

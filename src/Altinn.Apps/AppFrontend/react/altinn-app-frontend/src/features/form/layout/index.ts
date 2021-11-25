import { GridSize } from '@material-ui/core';
import { IOption, Triggers } from '../../../types';

export interface ILayouts {
  [id: string]: ILayout;
}

export interface ILayoutEntry {
  id: string;
  type: GroupTypes | ComponentTypes;
  triggers?: Triggers[];
}

export interface ILayoutGroup extends ILayoutEntry {
  children: string[];
  dataModelBindings?: IDataModelBindings;
  maxCount: number;
  textResourceBindings?: ITextResourceBindings;
  tableHeaders?: string[];
  edit?: IGroupEditProperties;
}

export interface ILayoutComponent extends ILayoutEntry {
  dataModelBindings: IDataModelBindings;
  isValid?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  textResourceBindings: ITextResourceBindings;
  formData?: any;
  grid?: IGrid;
}

export type GroupTypes = 'Group' | 'group';

export type ComponentTypes =
  'AddressComponent' |
  'AttachmentList' |
  'Button' |
  'Checkboxes' |
  'Datepicker' |
  'Dropdown' |
  'FileUpload' |
  'FileUploadWithTag' |
  'Header' |
  'Input' |
  'NavigationButtons' |
  'Paragraph' |
  'Image' |
  'RadioButtons' |
  'Summary' |
  'TextArea';

export interface IDataModelBindings {
  [id: string]: string;
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export type ILayout = Array<ILayoutComponent | ILayoutGroup>;

export interface ISelectionComponentProps extends ILayoutComponent {
  options?: IOption[];
  optionsId?: string;
}

export type IDatepickerProps = ILayoutComponent;

export interface IFileuploadProps extends ILayoutComponent {
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

export interface IHeaderProps extends ILayoutComponent {
  size: HeaderSize;
}

declare enum InputFieldType {
  text,
  email,
  password,
}

export interface IInputProps extends ILayoutComponent {
  inputType: InputFieldType;
}

export interface INavigationButtonProps extends ILayoutComponent {
  next?: string;
  previous?: string;
}

export type IParagraphProps = ILayoutComponent;

export interface IRadioButtonsProps extends ILayoutComponent {
  options: IOption[];
  preselectedOptionIndex: number;
}

export type ITextAreaProps = ILayoutComponent;

export interface IAdressComponent extends ILayoutComponent {
  addressTextResourceBinding: string;
  areaCodeTextResourceBinding: string;
  coTextResourceBinding: string;
  simpleDisplayMode: boolean;
}

export interface IGroupEditProperties {
  mode?: 'hideTable' | 'showTable' | 'showAll';
  filter?: IGroupFilter[];
  saveButton?: boolean;
  deleteButton?: boolean;
  multiPage?: boolean;
  openByDefault?: boolean;
}

export interface IGroupFilter {
  key: string;
  value: string;
}

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
}

export interface ILayoutComponent extends ILayoutEntry {
  type: string;
  dataModelBindings: IDataModelBindings;
  isValid?: boolean;
  readOnly: boolean;
  disabled?: boolean;
  required: boolean;
  textResourceBindings: ITextResourceBindings;
  triggers?: Triggers[];
}
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

export interface IDatepickerProps extends ILayoutComponent { }

export interface IFileuploadProps extends ILayoutComponent {
  maxNumberOfAttachments: number;
  maxFileSizeInMB: number;
  displayMode: any;
  hasCustomFileEndings: boolean;
  validFileEndings: any;
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

export interface IParagraphProps extends ILayoutComponent { }

export interface IRadioButtonsProps extends ILayoutComponent {
  options: IOption[];
  preselectedOptionIndex: number;
}

export interface ITextAreaProps extends ILayoutComponent { }

export interface IAdressComponent extends ILayoutComponent {
  addressTextResourceBinding: string;
  areaCodeTextResourceBinding: string;
  coTextResourceBinding: string;
  simpleDisplayMode: boolean;
}

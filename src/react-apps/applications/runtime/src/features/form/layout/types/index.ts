export interface ILayoutEntry {
  id: string;
  type: string;
}

export interface ILayoutContainer extends ILayoutEntry {
  children: [ILayoutContainer | ILayoutComponent];
}

export interface ILayoutComponent extends ILayoutEntry {
  dataModelBindings: IDataModelBindings;
  textResourceBindings: ITextResourceBindings;
  hidden: boolean;
  readOnly: boolean;
  disabled: boolean;
  isValid: boolean;
  required: boolean;
  triggerValidation?: boolean;
}
export interface IDataModelBindings {
  [id: string]: string;
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export type ILayout = [ILayoutComponent | ILayoutContainer];

export interface IComponentOptions {
  label: string;
  value: string;
}

export interface ICheckboxProps extends ILayoutComponent {
  options: IComponentOptions[];
  preSelectedOptionIndex: number;
}

export interface IDatepickerProps extends ILayoutComponent { }

export interface IDropdownProps extends ILayoutComponent {
  options: IComponentOptions[];
}

export interface IFileuploadProps extends ILayoutComponent {
  maxNumberOfAttachments: number;
  maxFileSizeInMB: number;
  displayMode: any;
  hasCustomFileEndings: boolean;
  validFileEndings: any;
}

enum HeaderSize {
  S,
  M,
  L,
}

export interface IHeaderProps extends ILayoutComponent {
  size: HeaderSize;
}

enum InputFieldType {
  text,
  email,
  password,
}

export interface IInputProps extends ILayoutComponent {
  inputType: InputFieldType;
}

export interface IParagraphProps extends ILayoutComponent { }

export interface IRadioButtonsProps extends ILayoutComponent {
  options: IComponentOptions[];
  preselectedOptionIndex: number;
}

export interface ITextAreaProps extends ILayoutComponent { }

export interface IAdressComponent extends ILayoutComponent {
  addressTextResourceBinding: string;
  areaCodeTextResourceBinding: string;
  coTextResourceBinding: string;
  simpleDisplayMode: boolean;
}

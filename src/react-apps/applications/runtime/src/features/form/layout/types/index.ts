
export interface IDataModelBindings {
  [id: string]: string;
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export interface IOptions {
  label: string;
  value: any;
}

export interface IFormComponent {
  id: string;
  component: string;
  dataModelBindings?: IDataModelBindings;
  hidden?: boolean;
  itemType: string;
  readOnly?: boolean;
  required?: boolean;
  textResourceBindings?: ITextResourceBindings;
  type?: string;
}

export interface IFormHeaderComponent extends IFormComponent {
  size: string;
}

export interface IFormInputComponent extends IFormComponent {
  type: string;
  disabled?: boolean;
}

export interface IFormCheckboxComponent extends IFormComponent {
  options: IOptions[];
  preselectedOptionIndex?: number;
}

export interface IFormTextAreaComponent extends IFormComponent { }

export interface IFormButtonComponent extends IFormComponent {
  onClickAction: () => void;
}

export interface IFormRadioButtonComponent extends IFormComponent {
  options: IOptions[];
  preselectedOptionIndex?: number;
}

export interface IFormDropdownComponent extends IFormComponent {
  options: IOptions[];
}

export interface IFormAddressComponent extends IFormComponent {
  simplified: boolean;
}

export interface IFormFileUploaderComponent extends IFormComponent {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  validFileEndings?: string;
}

export type FormComponentType =
  | IFormComponent
  | IFormHeaderComponent
  | IFormInputComponent
  | IFormCheckboxComponent
  | IFormTextAreaComponent
  | IFormButtonComponent
  | IFormRadioButtonComponent
  | IFormDropdownComponent
  | IFormFileUploaderComponent
  | IFormAddressComponent;

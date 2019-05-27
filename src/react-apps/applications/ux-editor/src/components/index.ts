import { AddressComponent } from './advanced/AddressComponent';
import { CheckboxContainerComponent } from './base/CheckboxesContainerComponent';
import { DatepickerComponent } from './base/DatepickerComponent';
import { DropdownComponent } from './base/DropdownComponent';
import { FileUploadComponent } from './base/FileUploadComponent';
import { HeaderComponent } from './base/HeaderComponent';
import { InputComponent } from './base/InputComponent';
import { ParagraphComponent } from './base/ParagraphComponent';
import { RadioButtonContainerComponent } from './base/RadioButtonsContainerComponent';
import { TextAreaComponent } from './base/TextAreaComponent';
import { ButtonComponent } from './widget/ButtonComponent';

export interface IComponentIcon {
  [key: string]: string;
}

export interface IComponent {
  name: string;
  Tag: any;
  Type: ComponentTypes;
  customProperties?: any;
  Icon: string;
}

// The order here should be the same as
// the exported 'components' list (drag and drop)
export enum ComponentTypes {
  Header,
  Paragraph,
  Input,
  Datepicker,
  DropDown,
  CheckBox,
  RadioButton,
  TextArea,
  FileUpload,
  Button,
  Container,
  AddressComponent,
}

export const componentIcons: IComponentIcon = {
  Header: 'fa fa-title',
  Paragraph: 'fa fa-paragraph',
  Input: 'fa fa-short-answer',
  Datepicker: 'fa fa-date',
  Dropdown: 'fa fa-drop-down',
  Checkboxes: 'fa fa-checkbox',
  RadioButtons: 'fa fa-radio-button',
  TextArea: 'fa fa-long-answer',
  FileUpload: 'fa fa-attachment',
  Button: 'fa fa-button',
  AddressComponent: 'fa fa-address',
};

export const textComponents: IComponent[] = [
  {
    name: 'Header',
    Tag: HeaderComponent,
    Type: ComponentTypes.Header,
    Icon: componentIcons.Header,
  },
  {
    name: 'Paragraph',
    Tag: ParagraphComponent,
    Type: ComponentTypes.Paragraph,
    Icon: componentIcons.Paragraph,
  },
];

export const schemaComponents: IComponent[] = [
  {
    name: 'Input',
    Tag: InputComponent,
    Type: ComponentTypes.Input,
    customProperties: {
      required: false,
      readOnly: false,
    },
    Icon: componentIcons.Input,
  },
  {
    name: 'Datepicker',
    Tag: DatepickerComponent,
    Type: ComponentTypes.Datepicker,
    customProperties: {
      readOnly: false,
    },
    Icon: componentIcons.Datepicker,
  },
  {
    name: 'Dropdown',
    Tag: DropdownComponent,
    Type: ComponentTypes.DropDown,
    Icon: componentIcons.Dropdown,
    customProperties: {
      options: [],
    },
  },
  {
    name: 'Checkboxes',
    Tag: CheckboxContainerComponent,
    Type: ComponentTypes.CheckBox,
    Icon: componentIcons.Checkboxes,
    customProperties: {
      options: [],
      required: false,
      readOnly: false,
    },
  },
  {
    name: 'RadioButtons',
    Tag: RadioButtonContainerComponent,
    Type: ComponentTypes.RadioButton,
    Icon: componentIcons.RadioButtons,
    customProperties: {
      options: [],
      required: false,
      readOnly: false,
    },
  },
  {
    name: 'TextArea',
    Tag: TextAreaComponent,
    Type: ComponentTypes.TextArea,
    customProperties: {
      required: false,
      readOnly: false,
    },
    Icon: componentIcons.TextArea,
  },
  {
    name: 'FileUpload',
    Tag: FileUploadComponent,
    Type: ComponentTypes.FileUpload,
    Icon: componentIcons.FileUpload,
    customProperties: {
      maxFileSizeInMB: 0,
      maxNumberOfAttachments: 1,
      displayMode: 'simple',
    },
  },
  {
    name: 'Button',
    Tag: ButtonComponent,
    Type: ComponentTypes.Button,
    Icon: componentIcons.Button,
    customProperties: {
      textResourceId: 'Standard.Button.Button',
      customType: 'Standard',
    },
  },
];

export const advancedComponents: IComponent[] = [
  {
    name: 'AddressComponent',
    Tag: AddressComponent,
    Type: ComponentTypes.AddressComponent,
    Icon: componentIcons.AddressComponent,
    customProperties: {
      simplified: true,
      readOnly: false,
    },
  },
];

const components: IComponent[] = textComponents.concat(schemaComponents, advancedComponents);

export default components;

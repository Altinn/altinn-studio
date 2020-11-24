/* eslint-disable no-shadow */
import { AddressComponent } from './advanced/AddressComponent';
import { ButtonComponent } from './base/ButtonComponent';
import { CheckboxContainerComponent } from './base/CheckboxesContainerComponent';
// eslint-disable-next-line import/no-cycle
import DatepickerComponent from './base/DatepickerComponent';
import DropdownComponent from './base/DropdownComponent';
import { FileUploadComponent } from './base/FileUploadComponent';
import { HeaderComponent } from './base/HeaderComponent';
import { InputComponent } from './base/InputComponent';
import { ParagraphComponent } from './base/ParagraphComponent';
import { RadioButtonContainerComponent } from './base/RadioButtonsContainerComponent';
import { TextAreaComponent } from './base/TextAreaComponent';
import { NavigationButtons as NavigationButtonsComponent } from './process-step/NavigationButtons';

export interface IComponent {
  name: string;
  Tag: any;
  Type: ComponentTypes;
  customProperties?: any;
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
  // eslint-disable-next-line @typescript-eslint/no-shadow
  AddressComponent,
  NavigationButtons,
}

export const textComponents: IComponent[] = [
  {
    name: 'Header',
    Tag: HeaderComponent,
    Type: ComponentTypes.Header,
  },
  {
    name: 'Paragraph',
    Tag: ParagraphComponent,
    Type: ComponentTypes.Paragraph,
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
  },
  {
    name: 'Datepicker',
    Tag: DatepickerComponent,
    Type: ComponentTypes.Datepicker,
    customProperties: {
      readOnly: false,
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
    },
  },
  {
    name: 'Dropdown',
    Tag: DropdownComponent,
    Type: ComponentTypes.DropDown,
    customProperties: {
      options: [],
    },
  },
  {
    name: 'Checkboxes',
    Tag: CheckboxContainerComponent,
    Type: ComponentTypes.CheckBox,
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
  },
  {
    name: 'FileUpload',
    Tag: FileUploadComponent,
    Type: ComponentTypes.FileUpload,
  },
  {
    name: 'Button',
    Tag: ButtonComponent,
    Type: ComponentTypes.Button,
  },
  {
    name: 'NavigationButtons',
    Tag: NavigationButtonsComponent,
    Type: ComponentTypes.NavigationButtons,
  },
];

export const advancedComponents: IComponent[] = [
  {
    name: 'AddressComponent',
    Tag: AddressComponent,
    Type: ComponentTypes.AddressComponent,
    customProperties: {
      simplified: true,
      readOnly: false,
    },
  },
];

const components: IComponent[] = textComponents.concat(schemaComponents, advancedComponents);

export default components;

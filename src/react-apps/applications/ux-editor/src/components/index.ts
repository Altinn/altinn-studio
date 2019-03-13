import { AddressComponent } from './advanced/AddressComponent';
import { CheckboxContainerComponent } from './base/CheckboxesContainerComponent';
import { DropdownComponent } from './base/DropdownComponent';
import { FileUploadComponent } from './base/FileUploadComponent';
import { HeaderComponent } from './base/HeaderComponent';
import { InputComponent } from './base/InputComponent';
import { ParagraphComponent } from './base/ParagraphComponent';
import { RadioButtonContainerComponent } from './base/RadioButtonsContainerComponent';
import { TextAreaComponent } from './base/TextAreaComponent';
import { SubmitComponent } from './widget/SubmitComponent';

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
  DropDown,
  CheckBox,
  RadioButton,
  TextArea,
  FileUpload,
  Submit,
  Container,
  AddressComponent,
}

export const componentIcons = {
  Header: 'fa fa-tittel',
  Paragraph: 'fa fa-paragraf',
  Input: 'fa fa-kortsvar',
  Dropdown: 'fa fa-nedtrekk',
  Checkboxes: 'fa fa-sjekkboks',
  RadioButtons: 'fa fa-radioknapp',
  TextArea: 'fa fa-langtsvar',
  FileUpload: 'fa fa-vedlegg',
  Submit: 'fa fa-knapp',
  AddressComponent: 'fa fa-adresse',
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
    Icon: componentIcons.Input,
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
    },
  },
  {
    name: 'RadioButtons',
    Tag: RadioButtonContainerComponent,
    Type: ComponentTypes.RadioButton,
    Icon: componentIcons.RadioButtons,
    customProperties: {
      options: [],
    },
  },
  {
    name: 'TextArea',
    Tag: TextAreaComponent,
    Type: ComponentTypes.TextArea,
    Icon: componentIcons.TextArea,
  },
  {
    name: 'FileUpload',
    Tag: FileUploadComponent,
    Type: ComponentTypes.FileUpload,
    Icon: componentIcons.FileUpload,
  },
  {
    name: 'Submit',
    Tag: SubmitComponent,
    Type: ComponentTypes.Submit,
    Icon: componentIcons.Submit,
    customProperties: {
      textResourceId: 'Standard.Button.Submit',
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
    },
  },
];

const components: IComponent[] = textComponents.concat(schemaComponents, advancedComponents);

export default components;

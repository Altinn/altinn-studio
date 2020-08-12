
export interface IComponentIcon {
  [key: string]: string;
}

export interface IComponent {
  name: string;
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
    Type: ComponentTypes.Header,
    Icon: componentIcons.Header,
  },
  {
    name: 'Paragraph',
    Type: ComponentTypes.Paragraph,
    Icon: componentIcons.Paragraph,
  },
];

export const schemaComponents: IComponent[] = [
  {
    name: 'Input',
    Type: ComponentTypes.Input,
    customProperties: {
      required: true,
      readOnly: false,
    },
    Icon: componentIcons.Input,
  },
  {
    name: 'TextArea',
    Type: ComponentTypes.TextArea,
    customProperties: {
      required: true,
      readOnly: false,
    },
    Icon: componentIcons.TextArea,
  },
  {
    name: 'Checkboxes',
    Type: ComponentTypes.CheckBox,
    Icon: componentIcons.Checkboxes,
    customProperties: {
      options: [],
      required: true,
    },
  },
  {
    name: 'RadioButtons',
    Type: ComponentTypes.RadioButton,
    Icon: componentIcons.RadioButtons,
    customProperties: {
      options: [],
      required: true,
    },
  },
  {
    name: 'Dropdown',
    Type: ComponentTypes.DropDown,
    Icon: componentIcons.Dropdown,
  },
  {
    name: 'FileUpload',
    Type: ComponentTypes.FileUpload,
    Icon: componentIcons.FileUpload,
    customProperties: {
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      displayMode: 'simple',
      required: true,
    },
  },
  {
    name: 'Datepicker',
    Type: ComponentTypes.Datepicker,
    customProperties: {
      readOnly: false,
      format: 'DD/MM/YYYY',
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
    },
    Icon: componentIcons.Datepicker,
  },
  {
    name: 'Button',
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

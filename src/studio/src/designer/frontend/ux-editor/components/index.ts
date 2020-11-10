export interface IComponentIcon {
  [key: string]: string;
}

export interface IComponent {
  name: string;
  customProperties?: any;
  Icon: string;
}

// The order here should be the same as
// the exported 'components' list (drag and drop)
export enum ComponentTypes {
  Header = 'Header',
  Paragraph = 'Paragraph',
  Input = 'Input',
  Datepicker = 'Datepicker',
  Dropdown = 'Dropdown',
  Checkboxes = 'Checkboxes',
  RadioButtons = 'RadioButtons',
  TextArea = 'TextArea',
  FileUpload = 'FileUpload',
  Button = 'Button',
  AddressComponent = 'AddressComponent',
  Group = 'Group',
  NavigationButtons = 'NavigationButtons'
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
  Group: 'fa fa-group',
  NavigationButtons: 'fa fa-button',
};

export const textComponents: IComponent[] = [
  {
    name: ComponentTypes.Header,
    Icon: componentIcons.Header,
  },
  {
    name: ComponentTypes.Paragraph,
    Icon: componentIcons.Paragraph,
  },
];

export const schemaComponents: IComponent[] = [
  {
    name: ComponentTypes.Input,
    customProperties: {
      required: true,
      readOnly: false,
    },
    Icon: componentIcons.Input,
  },
  {
    name: ComponentTypes.TextArea,
    customProperties: {
      required: true,
      readOnly: false,
    },
    Icon: componentIcons.TextArea,
  },
  {
    name: ComponentTypes.Checkboxes,
    Icon: componentIcons.Checkboxes,
    customProperties: {
      options: [],
      required: true,
    },
  },
  {
    name: ComponentTypes.RadioButtons,
    Icon: componentIcons.RadioButtons,
    customProperties: {
      options: [],
      required: true,
    },
  },
  {
    name: ComponentTypes.Dropdown,
    Icon: componentIcons.Dropdown,
  },
  {
    name: ComponentTypes.FileUpload,
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
    name: ComponentTypes.Datepicker,
    customProperties: {
      readOnly: false,
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
    },
    Icon: componentIcons.Datepicker,
  },
  {
    name: ComponentTypes.Button,
    Icon: componentIcons.Button,
  },
];

export const advancedComponents: IComponent[] = [
  {
    name: ComponentTypes.AddressComponent,
    Icon: componentIcons.AddressComponent,
    customProperties: {
      simplified: true,
      readOnly: false,
    },
  },
  {
    name: ComponentTypes.Group,
    Icon: componentIcons.Group,
    customProperties: {
      maxCount: 0,
      children: [],
    },
  },
];

const components: IComponent[] = textComponents.concat(schemaComponents, advancedComponents);

export default components;

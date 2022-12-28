import type { IThirdPartyComponent, IWidgetTexts } from '../types/global';
import type { EditSettings } from './config/componentConfig';

export interface IComponentIcon {
  [key: string]: string;
}

export interface IComponent {
  name: string;
  customProperties?: any;
  Icon: string;
}

export interface IThirdPartyComponentDefinition {
  displayName: string;
  componentDefinition: IThirdPartyComponent;
  editSettings: EditSettings[];
  texts: IWidgetTexts[];
}

export interface IThirdPartyComponentCustomProps {
  tagName: string;
  framework: 'WebComponent' | string;
  [id: string]: any;
}

// The order here should be the same as
// the exported 'components' list (drag and drop)
export enum ComponentTypes {
  Header = 'Header',
  Paragraph = 'Paragraph',
  Input = 'Input',
  Image = 'Image',
  Datepicker = 'Datepicker',
  Dropdown = 'Dropdown',
  Checkboxes = 'Checkboxes',
  RadioButtons = 'RadioButtons',
  TextArea = 'TextArea',
  FileUpload = 'FileUpload',
  FileUploadWithTag = 'FileUploadWithTag',
  Button = 'Button',
  AddressComponent = 'AddressComponent',
  Group = 'Group',
  NavigationBar = 'NavigationBar',
  NavigationButtons = 'NavigationButtons',
  AttachmentList = 'AttachmentList',
  ThirdParty = 'ThirdParty',
}

export const componentIcons: IComponentIcon = {
  Header: 'fa fa-title',
  Paragraph: 'fa fa-paragraph',
  Input: 'fa fa-short-answer',
  Image: 'fa fa-bilde',
  Datepicker: 'fa fa-date',
  Dropdown: 'fa fa-drop-down',
  Checkboxes: 'fa fa-checkbox',
  RadioButtons: 'fa fa-radio-button',
  TextArea: 'fa fa-long-answer',
  FileUpload: 'fa fa-attachment',
  FileUploadWithTag: 'fa fa-attachment',
  Button: 'fa fa-button',
  AddressComponent: 'fa fa-address',
  Group: 'fa fa-group',
  NavigationBar: 'fa fa-page-navigation',
  NavigationButtons: 'fa fa-button',
  AttachmentList: 'fa fa-attachment',
};
const Header = {
  name: ComponentTypes.Header,
  Icon: componentIcons.Header,
  customProperties: {
    size: 'L',
  },
};
const Paragraph = {
  name: ComponentTypes.Paragraph,
  Icon: componentIcons.Paragraph,
};

const Input = {
  name: ComponentTypes.Input,
  customProperties: {
    required: true,
    readOnly: false,
  },
  Icon: componentIcons.Input,
};

const TextArea = {
  name: ComponentTypes.TextArea,
  customProperties: {
    required: true,
    readOnly: false,
  },
  Icon: componentIcons.TextArea,
};
const Checkboxes = {
  name: ComponentTypes.Checkboxes,
  Icon: componentIcons.Checkboxes,
  customProperties: {
    options: [],
    required: true,
  },
};
const RadioButtons = {
  name: ComponentTypes.RadioButtons,
  Icon: componentIcons.RadioButtons,
  customProperties: {
    options: [],
    required: true,
  },
};
const Dropdown = {
  name: ComponentTypes.Dropdown,
  Icon: componentIcons.Dropdown,
};
const FileUpload = {
  name: ComponentTypes.FileUpload,
  Icon: componentIcons.FileUpload,
  customProperties: {
    maxFileSizeInMB: 25,
    maxNumberOfAttachments: 1,
    minNumberOfAttachments: 1,
    displayMode: 'simple',
    required: true,
  },
};
const FileUploadWithTag = {
  name: ComponentTypes.FileUploadWithTag,
  Icon: componentIcons.FileUploadWithTag,
  customProperties: {
    maxFileSizeInMB: 25,
    maxNumberOfAttachments: 1,
    minNumberOfAttachments: 1,
    required: true,
  },
};
const Datepicker = {
  name: ComponentTypes.Datepicker,
  customProperties: {
    readOnly: false,
    minDate: '1900-01-01T12:00:00.000Z',
    maxDate: '2100-01-01T12:00:00.000Z',
  },
  Icon: componentIcons.Datepicker,
};
const Button = {
  name: ComponentTypes.Button,
  Icon: componentIcons.Button,
};
const Image = {
  name: ComponentTypes.Image,
  Icon: componentIcons.Image,
  customProperties: {
    image: {
      src: {},
      width: '100%',
      align: 'center',
    },
  },
};

const AddressComponent = {
  name: ComponentTypes.AddressComponent,
  Icon: componentIcons.AddressComponent,
  customProperties: {
    simplified: true,
    readOnly: false,
  },
};
const AttachmentList = {
  name: ComponentTypes.AttachmentList,
  Icon: componentIcons.AttachmentList,
};
const Group = {
  name: ComponentTypes.Group,
  Icon: componentIcons.Group,
  customProperties: {
    maxCount: 0,
    children: [],
  },
};
const NavigationBar = {
  name: ComponentTypes.NavigationBar,
  Icon: componentIcons.NavigationBar,
};

export const advancedComponents: IComponent[] = [
  AddressComponent,
  AttachmentList,
  Group,
  NavigationBar,
];

export const schemaComponents: IComponent[] = [
  Input,
  TextArea,
  Checkboxes,
  RadioButtons,
  Dropdown,
  FileUpload,
  FileUploadWithTag,
  Datepicker,
  Button,
  Image,
];

export const textComponents: IComponent[] = [Header, Paragraph];

export const confOnScreenComponents: IComponent[] = [Header, Paragraph, AttachmentList, Image];

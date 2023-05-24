import { ComponentType } from '../components';
import { FormItem } from '../types/FormItem';

export type FormItemConfig<T extends ComponentType = ComponentType> = {
  name: T;
  defaultProperties: FormItem<T>;
  icon?: string;
};

export type FormItemConfigs = { [T in ComponentType]: FormItemConfig<T> };

export const formItemConfigs: FormItemConfigs = {
  [ComponentType.AddressComponent]: {
    name: ComponentType.AddressComponent,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.AddressComponent,
      dataModelBindings: {},
      simplified: true,
      readOnly: false,
    },
    icon: 'fa fa-address',
  },
  [ComponentType.AttachmentList]: {
    name: ComponentType.AttachmentList,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.AttachmentList,
      dataModelBindings: {},
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 0,
    },
    icon: 'fa fa-attachment',
  },
  [ComponentType.Button]: {
    name: ComponentType.Button,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Button,
      dataModelBindings: {},
      onClickAction: () => {},
    },
    icon: 'fa fa-button',
  },
  [ComponentType.Checkboxes]: {
    name: ComponentType.Checkboxes,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Checkboxes,
      dataModelBindings: {},
      options: [],
      optionsId: '',
      required: true,
    },
    icon: 'fa fa-checkbox',
  },
  [ComponentType.Datepicker]: {
    name: ComponentType.Datepicker,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Datepicker,
      dataModelBindings: {},
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      timeStamp: false,
      readOnly: false,
    },
    icon: 'fa fa-date',
  },
  [ComponentType.Dropdown]: {
    name: ComponentType.Dropdown,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Dropdown,
      dataModelBindings: {},
      optionsId: '',
    },
    icon: 'fa fa-drop-down',
  },
  [ComponentType.FileUpload]: {
    name: ComponentType.FileUpload,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.FileUpload,
      dataModelBindings: {},
      description: 'test',
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      required: true,
    },
    icon: 'fa fa-attachment',
  },
  [ComponentType.FileUploadWithTag]: {
    name: ComponentType.FileUploadWithTag,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.FileUploadWithTag,
      dataModelBindings: {},
      description: 'test',
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      optionsId: 'test',
      required: true,
    },
    icon: 'fa fa-attachment',
  },
  [ComponentType.Group]: {
    name: ComponentType.Group,
    defaultProperties: {
      itemType: 'CONTAINER',
    },
    icon: 'fa fa-group',
  },
  [ComponentType.Header]: {
    name: ComponentType.Header,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Header,
      dataModelBindings: {},
      size: 'L',
    },
    icon: 'fa fa-title',
  },
  [ComponentType.Image]: {
    name: ComponentType.Image,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Image,
      dataModelBindings: {},
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    }
  },
  [ComponentType.Input]: {
    name: ComponentType.Input,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      dataModelBindings: {},
      required: true,
      readOnly: false,
    },
    icon: 'fa fa-short-answer',
  },
  [ComponentType.Map]: {
    name: ComponentType.Map,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Map,
      dataModelBindings: {},
      centerLocation: {
        latitude: 0,
        longitude: 0,
      },
      zoom: 1,
    },
    icon: 'fa fa-address',
  },
  [ComponentType.NavigationBar]: {
    name: ComponentType.NavigationBar,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.NavigationBar,
      dataModelBindings: {},
    },
    icon: 'fa fa-page-navigation',
  },
  [ComponentType.NavigationButtons]: {
    name: ComponentType.NavigationButtons,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.NavigationButtons,
      dataModelBindings: {},
      onClickAction: () => {},
    },
    icon: 'fa fa-button',
  },
  [ComponentType.Panel]: {
    name: ComponentType.Panel,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Panel,
      dataModelBindings: {},
      variant: {
        title: 'test',
        description: 'test',
        type: 'test',
        enum: 'info',
        default: 'info',
      },
      showIcon: {
        title: 'test',
        description: 'test',
        type: true,
        default: true,
      },
    },
    icon: 'fa fa-paragraph',
  },
  [ComponentType.Paragraph]: {
    name: ComponentType.Paragraph,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Paragraph,
      dataModelBindings: {},
    },
    icon: 'fa fa-paragraph',
  },
  [ComponentType.RadioButtons]: {
    name: ComponentType.RadioButtons,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.RadioButtons,
      dataModelBindings: {},
      options: [],
      optionsId: '',
      required: true,
    },
    icon: 'fa fa-radio-button',
  },
  [ComponentType.TextArea]: {
    name: ComponentType.TextArea,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.TextArea,
      dataModelBindings: {},
    },
    icon: 'fa fa-long-answer',
  },
  [ComponentType.ThirdParty]: {
    name: ComponentType.ThirdParty,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.ThirdParty,
      dataModelBindings: {},
      tagName: 'tag',
      framework: 'framework',
    },
  }
};

export const advancedItems: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.AddressComponent],
  formItemConfigs[ComponentType.AttachmentList],
  formItemConfigs[ComponentType.Group],
  formItemConfigs[ComponentType.NavigationBar],
  formItemConfigs[ComponentType.Map],
];

export const schemaComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Input],
  formItemConfigs[ComponentType.TextArea],
  formItemConfigs[ComponentType.Checkboxes],
  formItemConfigs[ComponentType.RadioButtons],
  formItemConfigs[ComponentType.Dropdown],
  formItemConfigs[ComponentType.FileUpload],
  formItemConfigs[ComponentType.FileUploadWithTag],
  formItemConfigs[ComponentType.Datepicker],
  formItemConfigs[ComponentType.Button],
  formItemConfigs[ComponentType.Image],
];

export const textComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Header],
  formItemConfigs[ComponentType.Paragraph],
  formItemConfigs[ComponentType.Panel],
];

export const confOnScreenComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Header],
  formItemConfigs[ComponentType.Paragraph],
  formItemConfigs[ComponentType.AttachmentList],
  formItemConfigs[ComponentType.Image],
];




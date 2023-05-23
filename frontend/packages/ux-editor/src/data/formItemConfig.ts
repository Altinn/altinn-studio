import { FormItemType } from 'app-shared/types/FormItemType';
import { FormItem } from '../types/FormItem';

export type FormItemConfig<T extends FormItemType = FormItemType> = {
  name: T;
  defaultProperties: FormItem<T>;
  icon?: string;
};

export type FormItemConfigs = { [T in FormItemType]: FormItemConfig<T> };

export const formItemConfigs: FormItemConfigs = {
  [FormItemType.AddressComponent]: {
    name: FormItemType.AddressComponent,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.AddressComponent,
      dataModelBindings: {},
      simplified: true,
      readOnly: false,
    },
    icon: 'fa fa-address',
  },
  [FormItemType.AttachmentList]: {
    name: FormItemType.AttachmentList,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.AttachmentList,
      dataModelBindings: {},
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 0,
    },
    icon: 'fa fa-attachment',
  },
  [FormItemType.Button]: {
    name: FormItemType.Button,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Button,
      dataModelBindings: {},
      onClickAction: () => {},
    },
    icon: 'fa fa-button',
  },
  [FormItemType.Checkboxes]: {
    name: FormItemType.Checkboxes,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Checkboxes,
      dataModelBindings: {},
      options: [],
      optionsId: '',
      required: true,
    },
    icon: 'fa fa-checkbox',
  },
  [FormItemType.Datepicker]: {
    name: FormItemType.Datepicker,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Datepicker,
      dataModelBindings: {},
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      timeStamp: false,
      readOnly: false,
    },
    icon: 'fa fa-date',
  },
  [FormItemType.Dropdown]: {
    name: FormItemType.Dropdown,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Dropdown,
      dataModelBindings: {},
      optionsId: '',
    },
    icon: 'fa fa-drop-down',
  },
  [FormItemType.FileUpload]: {
    name: FormItemType.FileUpload,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.FileUpload,
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
  [FormItemType.FileUploadWithTag]: {
    name: FormItemType.FileUploadWithTag,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.FileUploadWithTag,
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
  [FormItemType.Group]: {
    name: FormItemType.Group,
    defaultProperties: {
      itemType: 'CONTAINER',
    },
    icon: 'fa fa-group',
  },
  [FormItemType.Header]: {
    name: FormItemType.Header,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Header,
      dataModelBindings: {},
      size: 'L',
    },
    icon: 'fa fa-title',
  },
  [FormItemType.Image]: {
    name: FormItemType.Image,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Image,
      dataModelBindings: {},
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    }
  },
  [FormItemType.Input]: {
    name: FormItemType.Input,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Input,
      dataModelBindings: {},
      required: true,
      readOnly: false,
    },
    icon: 'fa fa-short-answer',
  },
  [FormItemType.Map]: {
    name: FormItemType.Map,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Map,
      dataModelBindings: {},
      centerLocation: {
        latitude: 0,
        longitude: 0,
      },
      zoom: 1,
    },
    icon: 'fa fa-address',
  },
  [FormItemType.NavigationBar]: {
    name: FormItemType.NavigationBar,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.NavigationBar,
      dataModelBindings: {},
    },
    icon: 'fa fa-page-navigation',
  },
  [FormItemType.NavigationButtons]: {
    name: FormItemType.NavigationButtons,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.NavigationButtons,
      dataModelBindings: {},
      onClickAction: () => {},
    },
    icon: 'fa fa-button',
  },
  [FormItemType.Panel]: {
    name: FormItemType.Panel,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Panel,
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
  [FormItemType.Paragraph]: {
    name: FormItemType.Paragraph,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.Paragraph,
      dataModelBindings: {},
    },
    icon: 'fa fa-paragraph',
  },
  [FormItemType.RadioButtons]: {
    name: FormItemType.RadioButtons,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.RadioButtons,
      dataModelBindings: {},
      options: [],
      optionsId: '',
      required: true,
    },
    icon: 'fa fa-radio-button',
  },
  [FormItemType.TextArea]: {
    name: FormItemType.TextArea,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.TextArea,
      dataModelBindings: {},
    },
    icon: 'fa fa-long-answer',
  },
  [FormItemType.ThirdParty]: {
    name: FormItemType.ThirdParty,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: FormItemType.ThirdParty,
      dataModelBindings: {},
      tagName: 'tag',
      framework: 'framework',
    },
  }
};

export const advancedItems: FormItemConfigs[FormItemType][] = [
  formItemConfigs[FormItemType.AddressComponent],
  formItemConfigs[FormItemType.AttachmentList],
  formItemConfigs[FormItemType.Group],
  formItemConfigs[FormItemType.NavigationBar],
  formItemConfigs[FormItemType.Map],
];

export const schemaComponents: FormItemConfigs[FormItemType][] = [
  formItemConfigs[FormItemType.Input],
  formItemConfigs[FormItemType.TextArea],
  formItemConfigs[FormItemType.Checkboxes],
  formItemConfigs[FormItemType.RadioButtons],
  formItemConfigs[FormItemType.Dropdown],
  formItemConfigs[FormItemType.FileUpload],
  formItemConfigs[FormItemType.FileUploadWithTag],
  formItemConfigs[FormItemType.Datepicker],
  formItemConfigs[FormItemType.Button],
  formItemConfigs[FormItemType.Image],
];

export const textComponents: FormItemConfigs[FormItemType][] = [
  formItemConfigs[FormItemType.Header],
  formItemConfigs[FormItemType.Paragraph],
  formItemConfigs[FormItemType.Panel],
];

export const confOnScreenComponents: FormItemConfigs[FormItemType][] = [
  formItemConfigs[FormItemType.Header],
  formItemConfigs[FormItemType.Paragraph],
  formItemConfigs[FormItemType.AttachmentList],
  formItemConfigs[FormItemType.Image],
];




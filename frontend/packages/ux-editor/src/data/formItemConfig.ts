import { ComponentType } from 'app-shared/types/ComponentType';
import { FormItem } from '../types/FormItem';
import { FormPanelVariant } from '../types/FormComponent';

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
      propertyPath: 'definitions/addressComponent',
    },
    icon: 'fa fa-address',
  },
  [ComponentType.AttachmentList]: {
    name: ComponentType.AttachmentList,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.AttachmentList,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 0,
      propertyPath: 'definitions/attachmentListComponent',
    },
    icon: 'fa fa-attachment',
  },
  [ComponentType.Button]: {
    name: ComponentType.Button,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Button,
      onClickAction: () => {},
      propertyPath: 'definitions/actionButtonComponent',
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
      required: true,
      propertyPath: 'definitions/radioAndCheckboxComponents',
    },
    icon: 'fa fa-checkbox',
  },
  [ComponentType.Datepicker]: {
    name: ComponentType.Datepicker,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      dataModelBindings: {},
      type: ComponentType.Datepicker,
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      timeStamp: false,
      required: true,
      propertyPath: 'definitions/datepickerComponent',
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
      required: true,
      propertyPath: 'definitions/selectionComponents',
    },
    icon: 'fa fa-drop-down',
  },
  [ComponentType.FileUpload]: {
    name: ComponentType.FileUpload,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.FileUpload,
      description: '',
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      propertyPath: 'definitions/fileUploadComponent',
    },
    icon: 'fa fa-attachment',
  },
  [ComponentType.FileUploadWithTag]: {
    name: ComponentType.FileUploadWithTag,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.FileUploadWithTag,
      description: '',
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      optionsId: '',
      propertyPath: 'definitions/fileUploadWithTagComponent',
    },
    icon: 'fa fa-attachment',
  },
  [ComponentType.Group]: {
    name: ComponentType.Group,
    defaultProperties: {
      itemType: 'CONTAINER',
      propertyPath: 'definitions/groupComponent',
    },
    icon: 'fa fa-group',
  },
  [ComponentType.Header]: {
    name: ComponentType.Header,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Header,
      size: 'L',
      propertyPath: 'definitions/headerComponent',
    },
    icon: 'fa fa-title',
  },
  [ComponentType.Image]: {
    name: ComponentType.Image,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Image,
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
      propertyPath: 'definitions/imageComponent',
    },
  },
  [ComponentType.Input]: {
    name: ComponentType.Input,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      dataModelBindings: {},
      required: true,
      propertyPath: 'definitions/inputComponent',
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
      required: true,
      propertyPath: 'definitions/mapComponent',
    },
    icon: 'fa fa-address',
  },
  [ComponentType.NavigationBar]: {
    name: ComponentType.NavigationBar,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.NavigationBar,
      propertyPath: 'definitions/navigationBarComponent',
    },
    icon: 'fa fa-page-navigation',
  },
  [ComponentType.NavigationButtons]: {
    name: ComponentType.NavigationButtons,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.NavigationButtons,
      onClickAction: () => {},
      propertyPath: 'definitions/navigationButtonsComponent',
    },
    icon: 'fa fa-button',
  },
  [ComponentType.Panel]: {
    name: ComponentType.Panel,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Panel,
      variant: FormPanelVariant.Info,
      showIcon: true,
      propertyPath: 'definitions/panelComponent',
    },
    icon: 'fa fa-paragraph',
  },
  [ComponentType.Paragraph]: {
    name: ComponentType.Paragraph,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Paragraph,
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
      required: true,
      propertyPath: 'definitions/radioAndCheckboxComponents',
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
      required: true,
      propertyPath: 'definitions/textAreaComponent',
    },
    icon: 'fa fa-long-answer',
  },
  [ComponentType.ThirdParty]: {
    name: ComponentType.ThirdParty,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.ThirdParty,
      tagName: 'tag',
      framework: 'framework',
    },
  },
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

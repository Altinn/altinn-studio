import {
  FormAddressComponent,
  FormAttachmentListComponent,
  FormButtonComponent,
  FormCheckboxesComponent,
  FormComponentBase,
  FormDatepickerComponent,
  FormDropdownComponent,
  FormFileUploaderComponent,
  FormFileUploaderWithTagComponent,
  FormGroupComponent,
  FormHeaderComponent,
  FormImageComponent,
  FormInputComponent,
  FormMapComponent,
  FormNavigationBarComponent,
  FormPanelComponent,
  FormParagraphComponent,
  FormRadioButtonsComponent,
  FormTextareaComponent,
  FormThirdPartyComponent
} from '../types/FormComponent';
import { FormItemType } from 'app-shared/types/FormItemType';

const commonProps: Pick<FormComponentBase, 'id' | 'itemType' | 'dataModelBindings'> = {
  id: 'test',
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const checkboxesComponent: FormCheckboxesComponent = {
  ...commonProps,
  type: FormItemType.Checkboxes,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: 'test',
};
const radiosComponent: FormRadioButtonsComponent = {
  ...commonProps,
  type: FormItemType.RadioButtons,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: 'test',
};
const inputComponent: FormInputComponent = {
  ...commonProps,
  type: FormItemType.Input,
};
const headerComponent: FormHeaderComponent = {
  ...commonProps,
  type: FormItemType.Header,
  size: 'medium',
};
const paragraphComponent: FormParagraphComponent = {
  ...commonProps,
  type: FormItemType.Paragraph,
};
const imageComponent: FormImageComponent = {
  ...commonProps,
  type: FormItemType.Image,
};
const datePickerComponent: FormDatepickerComponent = {
  ...commonProps,
  type: FormItemType.Datepicker,
  timeStamp: true,
};
const dropdownComponent: FormDropdownComponent = {
  ...commonProps,
  type: FormItemType.Dropdown,
  optionsId: 'test',
};
const textareaComponent: FormTextareaComponent = {
  ...commonProps,
  type: FormItemType.TextArea,
};
const fileUploaderComponent: FormFileUploaderComponent = {
  ...commonProps,
  type: FormItemType.FileUpload,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
const fileUploaderWithTagComponent: FormFileUploaderWithTagComponent = {
  ...commonProps,
  type: FormItemType.FileUploadWithTag,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
  optionsId: 'test',
};
const buttonComponent: FormButtonComponent = {
  ...commonProps,
  type: FormItemType.Button,
  onClickAction: jest.fn(),
};
const addressComponent: FormAddressComponent = {
  ...commonProps,
  type: FormItemType.AddressComponent,
  simplified: true,
};
const groupComponent: FormGroupComponent = {
  ...commonProps,
  type: FormItemType.Group,
};
const navigationBarComponent: FormNavigationBarComponent = {
  ...commonProps,
  type: FormItemType.NavigationBar,
};
const attachmentListComponent: FormAttachmentListComponent = {
  ...commonProps,
  type: FormItemType.AttachmentList,
};
const thirdPartyComponent: FormThirdPartyComponent = {
  ...commonProps,
  type: FormItemType.ThirdParty,
  tagName: 'test',
  framework: 'test',
};
const panelComponent: FormPanelComponent = {
  ...commonProps,
  type: FormItemType.Panel,
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
};
const mapComponent: FormMapComponent = {
  ...commonProps,
  type: FormItemType.Map,
  centerLocation: {
    latitude: 0,
    longitude: 0,
  },
  zoom: 1,
};

export const componentMocks = {
  [FormItemType.AddressComponent]: addressComponent,
  [FormItemType.AttachmentList]: attachmentListComponent,
  [FormItemType.Button]: buttonComponent,
  [FormItemType.Checkboxes]: checkboxesComponent,
  [FormItemType.Datepicker]: datePickerComponent,
  [FormItemType.Dropdown]: dropdownComponent,
  [FormItemType.FileUploadWithTag]: fileUploaderWithTagComponent,
  [FormItemType.FileUpload]: fileUploaderComponent,
  [FormItemType.Group]: groupComponent,
  [FormItemType.Header]: headerComponent,
  [FormItemType.Image]: imageComponent,
  [FormItemType.Input]: inputComponent,
  [FormItemType.Map]: mapComponent,
  [FormItemType.NavigationBar]: navigationBarComponent,
  [FormItemType.Panel]: panelComponent,
  [FormItemType.Paragraph]: paragraphComponent,
  [FormItemType.RadioButtons]: radiosComponent,
  [FormItemType.TextArea]: textareaComponent,
  [FormItemType.ThirdParty]: thirdPartyComponent,
};

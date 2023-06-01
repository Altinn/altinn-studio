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
  FormPanelVariant,
  FormParagraphComponent,
  FormRadioButtonsComponent,
  FormTextareaComponent,
  FormThirdPartyComponent
} from '../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';

const commonProps: Pick<FormComponentBase, 'id' | 'itemType' | 'dataModelBindings'> = {
  id: 'test',
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const checkboxesComponent: FormCheckboxesComponent = {
  ...commonProps,
  type: ComponentType.Checkboxes,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: 'test',
};
const radiosComponent: FormRadioButtonsComponent = {
  ...commonProps,
  type: ComponentType.RadioButtons,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: 'test',
};
const inputComponent: FormInputComponent = {
  ...commonProps,
  type: ComponentType.Input,
};
const headerComponent: FormHeaderComponent = {
  ...commonProps,
  type: ComponentType.Header,
  size: 'medium',
};
const paragraphComponent: FormParagraphComponent = {
  ...commonProps,
  type: ComponentType.Paragraph,
};
const imageComponent: FormImageComponent = {
  ...commonProps,
  type: ComponentType.Image,
};
const datePickerComponent: FormDatepickerComponent = {
  ...commonProps,
  type: ComponentType.Datepicker,
  timeStamp: true,
};
const dropdownComponent: FormDropdownComponent = {
  ...commonProps,
  type: ComponentType.Dropdown,
  optionsId: 'test',
};
const textareaComponent: FormTextareaComponent = {
  ...commonProps,
  type: ComponentType.TextArea,
};
const fileUploaderComponent: FormFileUploaderComponent = {
  ...commonProps,
  type: ComponentType.FileUpload,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
const fileUploaderWithTagComponent: FormFileUploaderWithTagComponent = {
  ...commonProps,
  type: ComponentType.FileUploadWithTag,
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
  type: ComponentType.Button,
  onClickAction: jest.fn(),
};
const addressComponent: FormAddressComponent = {
  ...commonProps,
  type: ComponentType.AddressComponent,
  simplified: true,
};
const groupComponent: FormGroupComponent = {
  ...commonProps,
  type: ComponentType.Group,
};
const navigationBarComponent: FormNavigationBarComponent = {
  ...commonProps,
  type: ComponentType.NavigationBar,
};
const attachmentListComponent: FormAttachmentListComponent = {
  ...commonProps,
  type: ComponentType.AttachmentList,
};
const thirdPartyComponent: FormThirdPartyComponent = {
  ...commonProps,
  type: ComponentType.ThirdParty,
  tagName: 'test',
  framework: 'test',
};
const panelComponent: FormPanelComponent = {
  ...commonProps,
  type: ComponentType.Panel,
  variant: FormPanelVariant.Info,
  showIcon: true,
};
const mapComponent: FormMapComponent = {
  ...commonProps,
  type: ComponentType.Map,
  centerLocation: {
    latitude: 0,
    longitude: 0,
  },
  zoom: 1,
};

export const componentMocks = {
  [ComponentType.AddressComponent]: addressComponent,
  [ComponentType.AttachmentList]: attachmentListComponent,
  [ComponentType.Button]: buttonComponent,
  [ComponentType.Checkboxes]: checkboxesComponent,
  [ComponentType.Datepicker]: datePickerComponent,
  [ComponentType.Dropdown]: dropdownComponent,
  [ComponentType.FileUploadWithTag]: fileUploaderWithTagComponent,
  [ComponentType.FileUpload]: fileUploaderComponent,
  [ComponentType.Group]: groupComponent,
  [ComponentType.Header]: headerComponent,
  [ComponentType.Image]: imageComponent,
  [ComponentType.Input]: inputComponent,
  [ComponentType.Map]: mapComponent,
  [ComponentType.NavigationBar]: navigationBarComponent,
  [ComponentType.Panel]: panelComponent,
  [ComponentType.Paragraph]: paragraphComponent,
  [ComponentType.RadioButtons]: radiosComponent,
  [ComponentType.TextArea]: textareaComponent,
  [ComponentType.ThirdParty]: thirdPartyComponent,
};

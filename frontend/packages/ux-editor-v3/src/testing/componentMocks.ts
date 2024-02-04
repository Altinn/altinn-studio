import type { FormComponent, FormComponentBase } from '../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';

const commonProps: Pick<FormComponentBase, 'id' | 'itemType' | 'dataModelBindings'> = {
  id: 'test',
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const checkboxesComponent: FormComponent<ComponentType.Checkboxes> = {
  ...commonProps,
  type: ComponentType.Checkboxes,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: '',
};
const radiosComponent: FormComponent<ComponentType.RadioButtons> = {
  ...commonProps,
  type: ComponentType.RadioButtons,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: '',
};
const inputComponent: FormComponent<ComponentType.Input> = {
  ...commonProps,
  type: ComponentType.Input,
};
const headerComponent: FormComponent<ComponentType.Header> = {
  ...commonProps,
  type: ComponentType.Header,
  size: 'medium',
};
const paragraphComponent: FormComponent<ComponentType.Paragraph> = {
  ...commonProps,
  type: ComponentType.Paragraph,
};
const imageComponent: FormComponent<ComponentType.Image> = {
  ...commonProps,
  type: ComponentType.Image,
};
const datePickerComponent: FormComponent<ComponentType.Datepicker> = {
  ...commonProps,
  type: ComponentType.Datepicker,
  timeStamp: true,
};
const dropdownComponent: FormComponent<ComponentType.Dropdown> = {
  ...commonProps,
  type: ComponentType.Dropdown,
  optionsId: '',
};
const textareaComponent: FormComponent<ComponentType.TextArea> = {
  ...commonProps,
  type: ComponentType.TextArea,
};
const fileUploaderComponent: FormComponent<ComponentType.FileUpload> = {
  ...commonProps,
  type: ComponentType.FileUpload,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
const fileUploaderWithTagComponent: FormComponent<ComponentType.FileUploadWithTag> = {
  ...commonProps,
  type: ComponentType.FileUploadWithTag,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
  optionsId: '',
};
const buttonComponent: FormComponent<ComponentType.Button> = {
  ...commonProps,
  type: ComponentType.Button,
  onClickAction: jest.fn(),
};
const addressComponent: FormComponent<ComponentType.AddressComponent> = {
  ...commonProps,
  type: ComponentType.AddressComponent,
  simplified: true,
};
const groupComponent: FormComponent<ComponentType.Group> = {
  ...commonProps,
  type: ComponentType.Group,
};
const navigationBarComponent: FormComponent<ComponentType.NavigationBar> = {
  ...commonProps,
  type: ComponentType.NavigationBar,
};
const attachmentListComponent: FormComponent<ComponentType.AttachmentList> = {
  ...commonProps,
  type: ComponentType.AttachmentList,
};
const thirdPartyComponent: FormComponent<ComponentType.Custom> = {
  ...commonProps,
  type: ComponentType.Custom,
  tagName: 'test',
  framework: 'test',
};
const panelComponent: FormComponent<ComponentType.Panel> = {
  ...commonProps,
  type: ComponentType.Panel,
  variant: FormPanelVariant.Info,
  showIcon: true,
};
const mapComponent: FormComponent<ComponentType.Map> = {
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
  [ComponentType.Custom]: thirdPartyComponent,
};

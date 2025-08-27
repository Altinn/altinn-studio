import type { FormComponent, FormComponentBase } from '../types/FormComponent';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import type { FormContainer } from '../types/FormContainer';

const commonProps: Pick<FormComponentBase, 'id' | 'itemType' | 'dataModelBindings'> = {
  id: 'test',
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const checkboxesComponent: FormComponent<ComponentTypeV3.Checkboxes> = {
  ...commonProps,
  type: ComponentTypeV3.Checkboxes,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: '',
};
const radiosComponent: FormComponent<ComponentTypeV3.RadioButtons> = {
  ...commonProps,
  type: ComponentTypeV3.RadioButtons,
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: '',
};
const inputComponent: FormComponent<ComponentTypeV3.Input> = {
  ...commonProps,
  type: ComponentTypeV3.Input,
};
const headerComponent: FormComponent<ComponentTypeV3.Header> = {
  ...commonProps,
  type: ComponentTypeV3.Header,
  size: 'medium',
};
const paragraphComponent: FormComponent<ComponentTypeV3.Paragraph> = {
  ...commonProps,
  type: ComponentTypeV3.Paragraph,
};
const imageComponent: FormComponent<ComponentTypeV3.Image> = {
  ...commonProps,
  type: ComponentTypeV3.Image,
};
const datePickerComponent: FormComponent<ComponentTypeV3.Datepicker> = {
  ...commonProps,
  type: ComponentTypeV3.Datepicker,
  timeStamp: true,
};
const dropdownComponent: FormComponent<ComponentTypeV3.Dropdown> = {
  ...commonProps,
  type: ComponentTypeV3.Dropdown,
  optionsId: '',
};
const textareaComponent: FormComponent<ComponentTypeV3.TextArea> = {
  ...commonProps,
  type: ComponentTypeV3.TextArea,
};
const fileUploaderComponent: FormComponent<ComponentTypeV3.FileUpload> = {
  ...commonProps,
  type: ComponentTypeV3.FileUpload,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
const fileUploaderWithTagComponent: FormComponent<ComponentTypeV3.FileUploadWithTag> = {
  ...commonProps,
  type: ComponentTypeV3.FileUploadWithTag,
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
  optionsId: '',
};
const buttonComponent: FormComponent<ComponentTypeV3.Button> = {
  ...commonProps,
  type: ComponentTypeV3.Button,
  onClickAction: jest.fn(),
};
const addressComponent: FormComponent<ComponentTypeV3.AddressComponent> = {
  ...commonProps,
  type: ComponentTypeV3.AddressComponent,
  simplified: true,
};
const groupComponent: FormContainer = {
  ...commonProps,
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Group,
};
const navigationBarComponent: FormComponent<ComponentTypeV3.NavigationBar> = {
  ...commonProps,
  type: ComponentTypeV3.NavigationBar,
};
const attachmentListComponent: FormComponent<ComponentTypeV3.AttachmentList> = {
  ...commonProps,
  type: ComponentTypeV3.AttachmentList,
};
const thirdPartyComponent: FormComponent<ComponentTypeV3.Custom> = {
  ...commonProps,
  type: ComponentTypeV3.Custom,
  tagName: 'test',
  framework: 'test',
};
const panelComponent: FormComponent<ComponentTypeV3.Panel> = {
  ...commonProps,
  type: ComponentTypeV3.Panel,
  variant: FormPanelVariant.Info,
  showIcon: true,
};
const mapComponent: FormComponent<ComponentTypeV3.Map> = {
  ...commonProps,
  type: ComponentTypeV3.Map,
  centerLocation: {
    latitude: 0,
    longitude: 0,
  },
  zoom: 1,
};

export const componentMocks = {
  [ComponentTypeV3.AddressComponent]: addressComponent,
  [ComponentTypeV3.AttachmentList]: attachmentListComponent,
  [ComponentTypeV3.Button]: buttonComponent,
  [ComponentTypeV3.Checkboxes]: checkboxesComponent,
  [ComponentTypeV3.Datepicker]: datePickerComponent,
  [ComponentTypeV3.Dropdown]: dropdownComponent,
  [ComponentTypeV3.FileUploadWithTag]: fileUploaderWithTagComponent,
  [ComponentTypeV3.FileUpload]: fileUploaderComponent,
  [ComponentTypeV3.Group]: groupComponent,
  [ComponentTypeV3.Header]: headerComponent,
  [ComponentTypeV3.Image]: imageComponent,
  [ComponentTypeV3.Input]: inputComponent,
  [ComponentTypeV3.Map]: mapComponent,
  [ComponentTypeV3.NavigationBar]: navigationBarComponent,
  [ComponentTypeV3.Panel]: panelComponent,
  [ComponentTypeV3.Paragraph]: paragraphComponent,
  [ComponentTypeV3.RadioButtons]: radiosComponent,
  [ComponentTypeV3.TextArea]: textareaComponent,
  [ComponentTypeV3.Custom]: thirdPartyComponent,
};

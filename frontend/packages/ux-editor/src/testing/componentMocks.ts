import type { FormComponent, FormComponentBase } from '../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import type { FormContainer } from '../types/FormContainer';

const commonProps = <T extends ComponentType>(
  type: T,
): Pick<FormComponentBase<T>, 'id' | 'itemType' | 'dataModelBindings' | 'type'> => ({
  id: type.toString(),
  itemType: 'COMPONENT',
  dataModelBindings: {},
  type,
});
const checkboxesComponent: FormComponent<ComponentType.Checkboxes> = {
  ...commonProps(ComponentType.Checkboxes),
  dataModelBindings: { simpleBinding: '' },
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: '',
};
const radiosComponent: FormComponent<ComponentType.RadioButtons> = {
  ...commonProps(ComponentType.RadioButtons),
  dataModelBindings: { simpleBinding: '' },
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
  optionsId: '',
};
const inputComponent: FormComponent<ComponentType.Input> = {
  ...commonProps(ComponentType.Input),
  dataModelBindings: { simpleBinding: '' },
};
const headerComponent: FormComponent<ComponentType.Header> = {
  ...commonProps(ComponentType.Header),
  size: 'medium',
};
const paragraphComponent: FormComponent<ComponentType.Paragraph> = {
  ...commonProps(ComponentType.Paragraph),
};
const imageComponent: FormComponent<ComponentType.Image> = {
  ...commonProps(ComponentType.Image),
  image: {
    src: {},
    width: '100%',
    align: 'center',
  },
};
const datePickerComponent: FormComponent<ComponentType.Datepicker> = {
  ...commonProps(ComponentType.Datepicker),
  dataModelBindings: { simpleBinding: '' },
  timeStamp: true,
};
const dropdownComponent: FormComponent<ComponentType.Dropdown> = {
  ...commonProps(ComponentType.Dropdown),
  type: ComponentType.Dropdown,
  dataModelBindings: { simpleBinding: '' },
  optionsId: '',
};
const textareaComponent: FormComponent<ComponentType.TextArea> = {
  ...commonProps(ComponentType.TextArea),
  dataModelBindings: { simpleBinding: '' },
};
const subFormComponent: FormComponent<ComponentType.SubForm> = {
  ...commonProps(ComponentType.SubForm),
};
const fileUploadComponent: FormComponent<ComponentType.FileUpload> = {
  ...commonProps(ComponentType.FileUpload),
  dataModelBindings: { simpleBinding: '' },
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
const fileUploadWithTagComponent: FormComponent<ComponentType.FileUploadWithTag> = {
  ...commonProps(ComponentType.FileUploadWithTag),
  dataModelBindings: { simpleBinding: '' },
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
  optionsId: '',
  propertyPath: 'definitions/fileUploadComponent',
  pageIndex: null,
};
const buttonComponent: FormComponent<ComponentType.Button> = {
  ...commonProps(ComponentType.Button),
  onClickAction: jest.fn(),
};
const addressComponent: FormComponent<ComponentType.Address> = {
  ...commonProps(ComponentType.Address),
  dataModelBindings: {
    address: 'some-address',
    zipCode: 'some-zip',
    postPlace: 'some-place',
  },
  simplified: true,
};
const navigationBarComponent: FormComponent<ComponentType.NavigationBar> = {
  ...commonProps(ComponentType.NavigationBar),
};
const attachmentListComponent: FormComponent<ComponentType.AttachmentList> = {
  ...commonProps(ComponentType.AttachmentList),
};
const thirdPartyComponent: FormComponent<ComponentType.Custom> = {
  ...commonProps(ComponentType.Custom),
  tagName: 'test',
  framework: 'test',
};
const panelComponent: FormComponent<ComponentType.Panel> = {
  ...commonProps(ComponentType.Panel),
  variant: FormPanelVariant.Info,
  showIcon: true,
};
const mapComponent: FormComponent<ComponentType.Map> = {
  ...commonProps(ComponentType.Map),
  dataModelBindings: { simpleBinding: '' },
  centerLocation: {
    latitude: 0,
    longitude: 0,
  },
  zoom: 1,
};
const accordionContainer: FormContainer<ComponentType.Accordion> = {
  ...commonProps(ComponentType.Accordion),
  itemType: 'CONTAINER',
};
const accordionGroupContainer: FormContainer<ComponentType.AccordionGroup> = {
  ...commonProps(ComponentType.AccordionGroup),
  itemType: 'CONTAINER',
};
const buttonGroupContainer: FormContainer<ComponentType.ButtonGroup> = {
  ...commonProps(ComponentType.ButtonGroup),
  itemType: 'CONTAINER',
};
const groupContainer: FormContainer<ComponentType.Group> = {
  ...commonProps(ComponentType.Group),
  itemType: 'CONTAINER',
};
const repeatingGroupContainer: FormContainer<ComponentType.RepeatingGroup> = {
  ...commonProps(ComponentType.RepeatingGroup),
  itemType: 'CONTAINER',
  dataModelBindings: { group: '' },
};
const summary2Component: FormComponent<ComponentType.Summary2> = {
  ...commonProps(ComponentType.Summary2),
  target: {
    type: 'component',
  },
};

export const componentMocks = {
  [ComponentType.AccordionGroup]: accordionGroupContainer,
  [ComponentType.Accordion]: accordionContainer,
  [ComponentType.Address]: addressComponent,
  [ComponentType.AttachmentList]: attachmentListComponent,
  [ComponentType.ButtonGroup]: buttonGroupContainer,
  [ComponentType.Button]: buttonComponent,
  [ComponentType.Checkboxes]: checkboxesComponent,
  [ComponentType.Datepicker]: datePickerComponent,
  [ComponentType.Dropdown]: dropdownComponent,
  [ComponentType.FileUploadWithTag]: fileUploadWithTagComponent,
  [ComponentType.FileUpload]: fileUploadComponent,
  [ComponentType.Group]: groupContainer,
  [ComponentType.Header]: headerComponent,
  [ComponentType.Image]: imageComponent,
  [ComponentType.Input]: inputComponent,
  [ComponentType.Map]: mapComponent,
  [ComponentType.NavigationBar]: navigationBarComponent,
  [ComponentType.Panel]: panelComponent,
  [ComponentType.Paragraph]: paragraphComponent,
  [ComponentType.RadioButtons]: radiosComponent,
  [ComponentType.RepeatingGroup]: repeatingGroupContainer,
  [ComponentType.SubForm]: subFormComponent,
  [ComponentType.TextArea]: textareaComponent,
  [ComponentType.Custom]: thirdPartyComponent,
  [ComponentType.Summary2]: summary2Component,
};

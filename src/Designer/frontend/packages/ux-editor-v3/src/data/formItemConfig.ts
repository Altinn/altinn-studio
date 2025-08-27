import { ComponentTypeV3 as ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { FormItem } from '../types/FormItem';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import type { RefAttributes, SVGProps } from 'react';
import type React from 'react';
import ActionButtonSchema from '../testing/schemas/json/component/ActionButton.schema.v1.json';
import {
  AccordionIcon,
  CalendarIcon,
  CheckboxIcon,
  ChevronDownDoubleIcon,
  ExclamationmarkTriangleIcon,
  FileTextIcon,
  FingerButtonIcon,
  GroupIcon,
  HouseIcon,
  ImageIcon,
  InformationSquareIcon,
  LikertIcon,
  LinkIcon,
  LongTextIcon,
  NavBarIcon,
  PaperclipIcon,
  ParagraphIcon,
  PinIcon,
  PresentationIcon,
  RadioButtonIcon,
  SelectIcon,
  ShortTextIcon,
  TableIcon,
  TasklistIcon,
  TitleIcon,
} from 'libs/studio-icons/src';
import type { ContainerComponentType } from '../types/ContainerComponent';
import { LayoutItemType } from '../types/global';

export type FormItemConfig<T extends ComponentTypeV3 = ComponentTypeV3> = {
  name: T;
  itemType: LayoutItemType;
  defaultProperties: FormItem<T>;
  icon?: React.ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }> &
    RefAttributes<SVGSVGElement>;
} & (T extends ContainerComponentType ? { validChildTypes: ComponentTypeV3[] } : {});

export type FormItemConfigs = { [T in ComponentTypeV3]: FormItemConfig<T> };

export const formItemConfigs: FormItemConfigs = {
  [ComponentTypeV3.Alert]: {
    name: ComponentTypeV3.Alert,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Alert,
      severity: 'info',
      propertyPath: 'definitions/alertComponent',
    },
    icon: ExclamationmarkTriangleIcon,
  },
  [ComponentTypeV3.Accordion]: {
    name: ComponentTypeV3.Accordion,
    itemType: LayoutItemType.Container,
    defaultProperties: {
      id: '',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Accordion,
      propertyPath: 'definitions/accordionComponent',
    },
    icon: AccordionIcon,
    validChildTypes: [ComponentTypeV3.Paragraph],
  },
  [ComponentTypeV3.AccordionGroup]: {
    name: ComponentTypeV3.AccordionGroup,
    itemType: LayoutItemType.Container,
    defaultProperties: {
      id: '',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.AccordionGroup,
      propertyPath: 'definitions/accordionGroupComponent',
    },
    icon: ChevronDownDoubleIcon,
    validChildTypes: [ComponentTypeV3.Accordion],
  },
  [ComponentTypeV3.ActionButton]: {
    name: ComponentTypeV3.ActionButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.ActionButton,
      textResourceBindings: {
        title: '', // To avoid undefined as text when previewing default component
      },
      buttonStyle: ActionButtonSchema.properties.buttonStyle.enum[0], // To avoid rendering error in app-frontend when previewing default component
    },
    icon: FingerButtonIcon,
  },
  [ComponentTypeV3.AddressComponent]: {
    name: ComponentTypeV3.AddressComponent,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.AddressComponent,
      dataModelBindings: {},
      simplified: true,
      propertyPath: 'definitions/addressComponent',
    },
    icon: HouseIcon,
  },
  [ComponentTypeV3.AttachmentList]: {
    name: ComponentTypeV3.AttachmentList,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.AttachmentList,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 0,
      propertyPath: 'definitions/attachmentListComponent',
    },
    icon: PaperclipIcon,
  },
  [ComponentTypeV3.Button]: {
    name: ComponentTypeV3.Button,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Button,
      onClickAction: () => {},
      propertyPath: 'definitions/actionButtonComponent',
    },
    icon: FingerButtonIcon,
  },
  [ComponentTypeV3.ButtonGroup]: {
    name: ComponentTypeV3.ButtonGroup,
    itemType: LayoutItemType.Container,
    defaultProperties: {
      id: '',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.ButtonGroup,
      propertyPath: 'definitions/buttonGroupComponent',
    },
    icon: FingerButtonIcon,
    validChildTypes: [ComponentTypeV3.Button],
  },
  [ComponentTypeV3.Checkboxes]: {
    name: ComponentTypeV3.Checkboxes,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Checkboxes,
      dataModelBindings: {},
      required: true,
      propertyPath: 'definitions/radioAndCheckboxComponents',
    },
    icon: CheckboxIcon,
  },
  [ComponentTypeV3.Custom]: {
    name: ComponentTypeV3.Custom,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Custom,
      tagName: 'tag',
      framework: 'framework',
    },
  },
  [ComponentTypeV3.Datepicker]: {
    name: ComponentTypeV3.Datepicker,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      dataModelBindings: {},
      type: ComponentTypeV3.Datepicker,
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      timeStamp: true,
      required: true,
      propertyPath: 'definitions/datepickerComponent',
    },
    icon: CalendarIcon,
  },
  [ComponentTypeV3.Dropdown]: {
    name: ComponentTypeV3.Dropdown,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Dropdown,
      dataModelBindings: {},
      optionsId: '',
      required: true,
      propertyPath: 'definitions/selectionComponents',
    },
    icon: SelectIcon,
  },
  [ComponentTypeV3.FileUpload]: {
    name: ComponentTypeV3.FileUpload,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.FileUpload,
      description: '',
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      propertyPath: 'definitions/fileUploadComponent',
    },
    icon: PaperclipIcon,
  },
  [ComponentTypeV3.FileUploadWithTag]: {
    name: ComponentTypeV3.FileUploadWithTag,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.FileUploadWithTag,
      description: '',
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      optionsId: '',
      propertyPath: 'definitions/fileUploadWithTagComponent',
    },
    icon: PaperclipIcon,
  },
  [ComponentTypeV3.Grid]: {
    name: ComponentTypeV3.Grid,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Grid,
      propertyPath: 'definitions/gridComponent',
      rows: [],
    },
    icon: TableIcon,
  },
  [ComponentTypeV3.Group]: {
    name: ComponentTypeV3.Group,
    itemType: LayoutItemType.Container,
    defaultProperties: {
      id: '',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
      propertyPath: 'definitions/groupComponent',
    },
    icon: GroupIcon,
    validChildTypes: Object.values(ComponentTypeV3),
  },
  [ComponentTypeV3.Header]: {
    name: ComponentTypeV3.Header,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Header,
      size: 'L',
      propertyPath: 'definitions/headerComponent',
    },
    icon: TitleIcon,
  },
  [ComponentTypeV3.IFrame]: {
    name: ComponentTypeV3.IFrame,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.IFrame,
      sandbox: {},
    },
    icon: PresentationIcon,
  },
  [ComponentTypeV3.Image]: {
    name: ComponentTypeV3.Image,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Image,
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
      propertyPath: 'definitions/imageComponent',
    },
    icon: ImageIcon,
  },
  [ComponentTypeV3.Input]: {
    name: ComponentTypeV3.Input,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Input,
      dataModelBindings: {},
      required: true,
      propertyPath: 'definitions/inputComponent',
    },
    icon: ShortTextIcon,
  },
  [ComponentTypeV3.InstanceInformation]: {
    name: ComponentTypeV3.InstanceInformation,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.InstanceInformation,
      propertyPath: 'definitions/instanceInformationComponent',
    },
    icon: InformationSquareIcon,
  },
  [ComponentTypeV3.InstantiationButton]: {
    name: ComponentTypeV3.InstantiationButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.InstantiationButton,
    },
    icon: FingerButtonIcon,
  },
  [ComponentTypeV3.Likert]: {
    name: ComponentTypeV3.Likert,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Likert,
      dataModelBindings: {},
      propertyPath: 'definitions/radioAndCheckboxComponents',
    },
    icon: LikertIcon,
  },
  [ComponentTypeV3.Link]: {
    name: ComponentTypeV3.Link,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Link,
    },
    icon: LinkIcon,
  },
  [ComponentTypeV3.List]: {
    name: ComponentTypeV3.List,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.List,
      propertyPath: 'definitions/listComponent',
    },
    icon: TasklistIcon,
  },
  [ComponentTypeV3.Map]: {
    name: ComponentTypeV3.Map,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Map,
      dataModelBindings: {},
      centerLocation: {
        latitude: 0,
        longitude: 0,
      },
      zoom: 1,
      required: true,
      propertyPath: 'definitions/mapComponent',
    },
    icon: PinIcon,
  },
  [ComponentTypeV3.MultipleSelect]: {
    name: ComponentTypeV3.MultipleSelect,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.MultipleSelect,
      dataModelBindings: {},
      optionsId: '',
      required: true,
      propertyPath: 'definitions/selectionComponents',
    },
    icon: SelectIcon,
  },
  [ComponentTypeV3.NavigationBar]: {
    name: ComponentTypeV3.NavigationBar,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.NavigationBar,
      propertyPath: 'definitions/navigationBarComponent',
    },
    icon: NavBarIcon,
  },
  [ComponentTypeV3.NavigationButtons]: {
    name: ComponentTypeV3.NavigationButtons,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.NavigationButtons,
      onClickAction: () => {},
      propertyPath: 'definitions/navigationButtonsComponent',
    },
    icon: FingerButtonIcon,
  },
  [ComponentTypeV3.Panel]: {
    name: ComponentTypeV3.Panel,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Panel,
      variant: FormPanelVariant.Info,
      showIcon: true,
      propertyPath: 'definitions/panelComponent',
    },
    icon: FileTextIcon,
  },
  [ComponentTypeV3.Paragraph]: {
    name: ComponentTypeV3.Paragraph,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Paragraph,
    },
    icon: ParagraphIcon,
  },
  [ComponentTypeV3.PrintButton]: {
    name: ComponentTypeV3.PrintButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.PrintButton,
    },
    icon: FingerButtonIcon,
  },
  [ComponentTypeV3.RadioButtons]: {
    name: ComponentTypeV3.RadioButtons,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.RadioButtons,
      dataModelBindings: {},
      required: true,
      propertyPath: 'definitions/radioAndCheckboxComponents',
    },
    icon: RadioButtonIcon,
  },
  [ComponentTypeV3.Summary]: {
    name: ComponentTypeV3.Summary,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Summary,
      propertyPath: 'definitions/summaryComponent',
    },
    icon: FileTextIcon,
  },
  [ComponentTypeV3.TextArea]: {
    name: ComponentTypeV3.TextArea,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.TextArea,
      dataModelBindings: {},
      required: true,
      propertyPath: 'definitions/textAreaComponent',
    },
    icon: LongTextIcon,
  },
};

export const advancedItems: FormItemConfigs[ComponentTypeV3][] = [
  formItemConfigs[ComponentTypeV3.AddressComponent],
  formItemConfigs[ComponentTypeV3.AttachmentList],
  formItemConfigs[ComponentTypeV3.Group],
  formItemConfigs[ComponentTypeV3.Grid],
  formItemConfigs[ComponentTypeV3.NavigationBar],
  formItemConfigs[ComponentTypeV3.Map],
  formItemConfigs[ComponentTypeV3.ButtonGroup],
  formItemConfigs[ComponentTypeV3.Accordion],
  formItemConfigs[ComponentTypeV3.AccordionGroup],
  formItemConfigs[ComponentTypeV3.List],
];

export const schemaComponents: FormItemConfigs[ComponentTypeV3][] = [
  formItemConfigs[ComponentTypeV3.Input],
  formItemConfigs[ComponentTypeV3.TextArea],
  formItemConfigs[ComponentTypeV3.Checkboxes],
  formItemConfigs[ComponentTypeV3.RadioButtons],
  formItemConfigs[ComponentTypeV3.Dropdown],
  formItemConfigs[ComponentTypeV3.MultipleSelect],
  formItemConfigs[ComponentTypeV3.Likert],
  formItemConfigs[ComponentTypeV3.Datepicker],
  formItemConfigs[ComponentTypeV3.FileUpload],
  formItemConfigs[ComponentTypeV3.FileUploadWithTag],
  formItemConfigs[ComponentTypeV3.Button],
  formItemConfigs[ComponentTypeV3.NavigationButtons],
  formItemConfigs[ComponentTypeV3.PrintButton],
  formItemConfigs[ComponentTypeV3.InstantiationButton],
  formItemConfigs[ComponentTypeV3.ActionButton],
  formItemConfigs[ComponentTypeV3.Image],
  formItemConfigs[ComponentTypeV3.Link],
  formItemConfigs[ComponentTypeV3.IFrame],
  formItemConfigs[ComponentTypeV3.InstanceInformation],
  formItemConfigs[ComponentTypeV3.Summary],
];

export const textComponents: FormItemConfigs[ComponentTypeV3][] = [
  formItemConfigs[ComponentTypeV3.Header],
  formItemConfigs[ComponentTypeV3.Paragraph],
  formItemConfigs[ComponentTypeV3.Panel],
  formItemConfigs[ComponentTypeV3.Alert],
];

export const confOnScreenComponents: FormItemConfigs[ComponentTypeV3][] = [
  formItemConfigs[ComponentTypeV3.Header],
  formItemConfigs[ComponentTypeV3.Paragraph],
  formItemConfigs[ComponentTypeV3.AttachmentList],
  formItemConfigs[ComponentTypeV3.Image],
];

import type React from 'react';
import { type RefAttributes, type SVGProps } from 'react';
import { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import {
  AccordionIcon,
  CalendarIcon,
  CheckboxIcon,
  ChevronDownDoubleIcon,
  ClipboardIcon,
  ElementIcon,
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
  MinusIcon,
  NavBarIcon,
  PaperclipIcon,
  PaymentDetailsIcon,
  PinIcon,
  PresentationIcon,
  RadioButtonIcon,
  RepeatingGroupIcon,
  SelectIcon,
  ShortTextIcon,
  TableIcon,
  TasklistIcon,
  TextIcon,
  TitleIcon,
  WalletIcon,
} from '@studio/icons';
import type { ContainerComponentType } from '../types/ContainerComponent';
import { LayoutItemType } from '../types/global';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FilterUtils } from './FilterUtils';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export type FormItemConfig<T extends ComponentType | CustomComponentType = ComponentType> = {
  name: ComponentType | CustomComponentType;
  getDisplayName?: (
    formItem: ComponentSpecificConfig<ComponentType>,
  ) => ComponentType | CustomComponentType;
  componentRef?: ComponentType;
  itemType: T extends ContainerComponentType ? LayoutItemType.Container : LayoutItemType.Component;
  defaultProperties: ComponentSpecificConfig;
  icon?: React.ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }> &
    RefAttributes<SVGSVGElement>;
  propertyPath?: string;
} & (T extends ContainerComponentType ? { validChildTypes: ComponentType[] } : {});

export type FormItemConfigs = { [T in ComponentType | CustomComponentType]: FormItemConfig<T> };

export const formItemConfigs: FormItemConfigs = {
  [ComponentType.Alert]: {
    name: ComponentType.Alert,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      severity: 'info',
    },
    propertyPath: 'definitions/alertComponent',
    icon: ExclamationmarkTriangleIcon,
  },
  [ComponentType.Accordion]: {
    name: ComponentType.Accordion,
    itemType: LayoutItemType.Container,
    defaultProperties: {},
    propertyPath: 'definitions/accordionComponent',
    icon: AccordionIcon,
    validChildTypes: [ComponentType.Paragraph],
  },
  [ComponentType.AccordionGroup]: {
    name: ComponentType.AccordionGroup,
    itemType: LayoutItemType.Container,
    defaultProperties: {},
    propertyPath: 'definitions/accordionGroupComponent',
    icon: ChevronDownDoubleIcon,
    validChildTypes: [ComponentType.Accordion],
  },
  [ComponentType.ActionButton]: {
    name: ComponentType.ActionButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      buttonStyle: 'primary',
      action: 'instantiate',
    },
    icon: FingerButtonIcon,
  },
  [ComponentType.Address]: {
    name: ComponentType.Address,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        address: '',
        zipCode: '',
        postPlace: '',
      },
      simplified: true,
      saveWhileTyping: 400,
    },
    propertyPath: 'definitions/addressComponent',
    icon: HouseIcon,
  },
  [ComponentType.AttachmentList]: {
    name: ComponentType.AttachmentList,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    propertyPath: 'definitions/attachmentListComponent',
    icon: PaperclipIcon,
  },
  [ComponentType.Button]: {
    name: ComponentType.Button,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    propertyPath: 'definitions/actionButtonComponent',
    icon: FingerButtonIcon,
  },
  [ComponentType.ButtonGroup]: {
    name: ComponentType.ButtonGroup,
    itemType: LayoutItemType.Container,
    defaultProperties: {},
    propertyPath: 'definitions/buttonGroupComponent',
    icon: FingerButtonIcon,
    validChildTypes: [
      ComponentType.ActionButton,
      ComponentType.Button,
      ComponentType.CustomButton,
      ComponentType.NavigationButtons,
      ComponentType.PrintButton,
      ComponentType.InstantiationButton,
    ],
  },
  [ComponentType.Checkboxes]: {
    name: ComponentType.Checkboxes,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    propertyPath: 'definitions/radioAndCheckboxComponents',
    icon: CheckboxIcon,
  },
  [ComponentType.Custom]: {
    name: ComponentType.Custom,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      tagName: 'tag',
      framework: 'framework',
    },
    icon: ElementIcon,
  },
  [ComponentType.CustomButton]: {
    name: ComponentType.CustomButton,
    itemType: LayoutItemType.Component,
    getDisplayName: ({
      actions,
    }: ComponentSpecificConfig<ComponentType.CustomButton>):
      | ComponentType
      | CustomComponentType => {
      const isCloseSubformAction =
        actions?.length === 1 &&
        actions[0]?.id === 'closeSubform' &&
        actions[0]?.type === 'ClientAction';

      return isCloseSubformAction
        ? CustomComponentType.CloseSubformButton
        : ComponentType.CustomButton;
    },
    defaultProperties: {
      actions: [],
      buttonStyle: 'primary',
    },
    icon: FingerButtonIcon,
  },
  [CustomComponentType.CloseSubformButton]: {
    name: CustomComponentType.CloseSubformButton,
    componentRef: ComponentType.CustomButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      actions: [
        {
          type: 'ClientAction',
          id: 'closeSubform',
        },
      ],
    },
    icon: FingerButtonIcon,
  },

  [ComponentType.Datepicker]: {
    name: ComponentType.Datepicker,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      timeStamp: true,
    },
    propertyPath: 'definitions/datepickerComponent',
    icon: CalendarIcon,
  },
  [ComponentType.Dropdown]: {
    name: ComponentType.Dropdown,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      optionsId: '',
    },
    propertyPath: 'definitions/selectionComponents',
    icon: SelectIcon,
  },
  [ComponentType.FileUpload]: {
    name: ComponentType.FileUpload,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
    },
    propertyPath: 'definitions/fileUploadComponent',
    icon: PaperclipIcon,
  },
  [ComponentType.FileUploadWithTag]: {
    name: ComponentType.FileUploadWithTag,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      optionsId: '',
    },
    propertyPath: 'definitions/fileUploadWithTagComponent',
    icon: PaperclipIcon,
  },
  [ComponentType.Grid]: {
    name: ComponentType.Grid,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      rows: [],
    },
    propertyPath: 'definitions/gridComponent',
    icon: TableIcon,
  },
  [ComponentType.Group]: {
    name: ComponentType.Group,
    itemType: LayoutItemType.Container,
    defaultProperties: {},
    propertyPath: 'definitions/groupComponent',
    icon: GroupIcon,
    validChildTypes: Object.values(ComponentType),
  },
  [ComponentType.Header]: {
    name: ComponentType.Header,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      size: 'L',
    },
    propertyPath: 'definitions/headerComponent',
    icon: TitleIcon,
  },
  [ComponentType.IFrame]: {
    name: ComponentType.IFrame,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      sandbox: {},
    },
    icon: PresentationIcon,
  },
  [ComponentType.Image]: {
    name: ComponentType.Image,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    },
    propertyPath: 'definitions/imageComponent',
    icon: ImageIcon,
  },
  [ComponentType.ImageUpload]: {
    name: ComponentType.ImageUpload,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      crop: {
        shape: 'circle',
        diameter: 250,
      },
    },
    propertyPath: 'definitions/imageUploadComponent',
    icon: ImageIcon,
  },
  [ComponentType.Input]: {
    name: ComponentType.Input,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    propertyPath: 'definitions/inputComponent',
    icon: ShortTextIcon,
  },
  [ComponentType.InstanceInformation]: {
    name: ComponentType.InstanceInformation,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    propertyPath: 'definitions/instanceInformationComponent',
    icon: InformationSquareIcon,
  },
  [ComponentType.InstantiationButton]: {
    name: ComponentType.InstantiationButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  [ComponentType.Likert]: {
    name: ComponentType.Likert,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        questions: '',
        answer: '',
      },
    },
    propertyPath: 'definitions/radioAndCheckboxComponents',
    icon: LikertIcon,
  },
  [ComponentType.Link]: {
    name: ComponentType.Link,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      style: 'link',
    },
    icon: LinkIcon,
  },
  [ComponentType.List]: {
    name: ComponentType.List,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {},
      tableHeaders: {},
      dataListId: '',
    },
    propertyPath: 'definitions/listComponent',
    icon: TasklistIcon,
  },
  [ComponentType.Map]: {
    name: ComponentType.Map,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      centerLocation: {
        latitude: 0,
        longitude: 0,
      },
      zoom: 1,
    },
    propertyPath: 'definitions/mapComponent',
    icon: PinIcon,
  },
  [ComponentType.MultipleSelect]: {
    name: ComponentType.MultipleSelect,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      optionsId: '',
    },
    propertyPath: 'definitions/selectionComponents',
    icon: SelectIcon,
  },
  [ComponentType.NavigationBar]: {
    name: ComponentType.NavigationBar,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    propertyPath: 'definitions/navigationBarComponent',
    icon: NavBarIcon,
  },
  [ComponentType.NavigationButtons]: {
    name: ComponentType.NavigationButtons,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    propertyPath: 'definitions/navigationButtonsComponent',
    icon: FingerButtonIcon,
  },
  [ComponentType.OrganisationLookup]: {
    name: ComponentType.OrganisationLookup,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    icon: ShortTextIcon,
  },
  [ComponentType.Panel]: {
    name: ComponentType.Panel,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      variant: FormPanelVariant.Info,
      showIcon: true,
    },
    propertyPath: 'definitions/panelComponent',
    icon: FileTextIcon,
  },
  [ComponentType.Paragraph]: {
    name: ComponentType.Paragraph,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      itemType: 'COMPONENT',
      type: ComponentType.Paragraph,
    },
    icon: TextIcon,
  },
  [ComponentType.Payment]: {
    name: ComponentType.Payment,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    icon: WalletIcon,
  },
  [ComponentType.PaymentDetails]: {
    name: ComponentType.PaymentDetails,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    icon: PaymentDetailsIcon,
  },
  [ComponentType.PersonLookup]: {
    name: ComponentType.PersonLookup,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    icon: ShortTextIcon,
  },
  [ComponentType.PrintButton]: {
    name: ComponentType.PrintButton,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  [ComponentType.RadioButtons]: {
    name: ComponentType.RadioButtons,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    propertyPath: 'definitions/radioAndCheckboxComponents',
    icon: RadioButtonIcon,
  },
  [ComponentType.RepeatingGroup]: {
    name: ComponentType.RepeatingGroup,
    itemType: LayoutItemType.Container,
    defaultProperties: {
      dataModelBindings: {
        group: '',
      },
    },
    propertyPath: 'definitions/repeatingGroupComponent',
    icon: RepeatingGroupIcon,
    validChildTypes: Object.values(ComponentType),
  },
  [ComponentType.Subform]: {
    name: ComponentType.Subform,
    itemType: LayoutItemType.Component,
    defaultProperties: {},
    propertyPath: 'definitions/subform',
    icon: ClipboardIcon,
  },
  [ComponentType.Summary]: {
    name: ComponentType.Summary,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      componentRef: '',
    },
    propertyPath: 'definitions/summaryComponent',
    icon: FileTextIcon,
  },
  [ComponentType.Summary2]: {
    name: ComponentType.Summary2,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      target: {
        type: 'layoutSet',
        id: '',
        taskId: '',
      },
    },
    propertyPath: 'definitions/summary2Component',
    icon: FileTextIcon,
  },
  [ComponentType.Text]: {
    name: ComponentType.Text,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      value: '',
    },
    propertyPath: 'definitions/textComponent',
    icon: TextIcon,
  },
  [ComponentType.TextArea]: {
    name: ComponentType.TextArea,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    propertyPath: 'definitions/textAreaComponent',
    icon: LongTextIcon,
  },
  [ComponentType.Divider]: {
    name: ComponentType.Divider,
    itemType: LayoutItemType.Component,
    defaultProperties: {
      id: '',
      type: ComponentType.Divider,
    },
    propertyPath: 'definitions/dividerComponent',
    icon: MinusIcon,
  },
};

export const advancedItems: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Address],
  formItemConfigs[ComponentType.AttachmentList],
  formItemConfigs[ComponentType.Group],
  formItemConfigs[ComponentType.Grid],
  formItemConfigs[ComponentType.NavigationBar],
  formItemConfigs[ComponentType.Map],
  formItemConfigs[ComponentType.ButtonGroup],
  formItemConfigs[ComponentType.Accordion],
  formItemConfigs[ComponentType.AccordionGroup],
  formItemConfigs[ComponentType.List],
  formItemConfigs[ComponentType.RepeatingGroup],
  formItemConfigs[ComponentType.PaymentDetails],
  formItemConfigs[ComponentType.Subform],
].filter(FilterUtils.filterOutDisabledFeatureItems);

export const schemaComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Input],
  formItemConfigs[ComponentType.TextArea],
  formItemConfigs[ComponentType.Checkboxes],
  formItemConfigs[ComponentType.RadioButtons],
  formItemConfigs[ComponentType.Dropdown],
  formItemConfigs[ComponentType.MultipleSelect],
  formItemConfigs[ComponentType.OrganisationLookup],
  formItemConfigs[ComponentType.PersonLookup],
  formItemConfigs[ComponentType.Likert],
  formItemConfigs[ComponentType.Datepicker],
  formItemConfigs[ComponentType.Divider],
  formItemConfigs[ComponentType.FileUpload],
  formItemConfigs[ComponentType.FileUploadWithTag],
  formItemConfigs[ComponentType.Button],
  formItemConfigs[ComponentType.CustomButton],
  formItemConfigs[ComponentType.NavigationButtons],
  formItemConfigs[ComponentType.PrintButton],
  formItemConfigs[ComponentType.InstantiationButton],
  formItemConfigs[ComponentType.ActionButton],
  formItemConfigs[ComponentType.Image],
  shouldDisplayFeature(FeatureFlag.ImageUpload) && formItemConfigs[ComponentType.ImageUpload],
  formItemConfigs[ComponentType.Link],
  formItemConfigs[ComponentType.IFrame],
  formItemConfigs[ComponentType.InstanceInformation],
  formItemConfigs[ComponentType.Summary2],
].filter(FilterUtils.filterOutDisabledFeatureItems);

export const textComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Header],
  formItemConfigs[ComponentType.Paragraph],
  formItemConfigs[ComponentType.Panel],
  formItemConfigs[ComponentType.Alert],
  formItemConfigs[ComponentType.Text],
];

export const confOnScreenComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Header],
  formItemConfigs[ComponentType.Paragraph],
  formItemConfigs[ComponentType.AttachmentList],
  formItemConfigs[ComponentType.Image],
];

export const paymentLayoutComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Payment],
  ...confOnScreenComponents,
];

export const defaultComponents: ComponentType[] = [
  ComponentType.Input,
  ComponentType.TextArea,
  ComponentType.RadioButtons,
  ComponentType.Dropdown,
  ComponentType.Datepicker,
  ComponentType.FileUpload,
  ComponentType.Header,
  ComponentType.Paragraph,
  ComponentType.Button,
];

export const allComponents: KeyValuePairs<ComponentType[]> = {
  form: [
    ComponentType.Input,
    ComponentType.TextArea,
    ComponentType.Datepicker,
    ComponentType.OrganisationLookup,
    ComponentType.PersonLookup,
  ],
  text: [
    ComponentType.Header,
    ComponentType.Paragraph,
    ComponentType.Panel,
    ComponentType.Alert,
    ComponentType.Divider,
    ComponentType.Text,
  ],
  select: [
    ComponentType.Checkboxes,
    ComponentType.RadioButtons,
    ComponentType.Dropdown,
    ComponentType.MultipleSelect,
    ComponentType.Likert,
  ],
  info: [
    ComponentType.InstanceInformation,
    ComponentType.Image,
    ComponentType.Link,
    ComponentType.IFrame,
    ComponentType.Summary2,
  ],
  button: [
    ComponentType.Button,
    ComponentType.CustomButton,
    ComponentType.NavigationButtons,
    ComponentType.PrintButton,
    ComponentType.InstantiationButton,
    ComponentType.ActionButton,
  ],
  attachment: [
    ComponentType.AttachmentList,
    ComponentType.FileUpload,
    ComponentType.FileUploadWithTag,
    ...(shouldDisplayFeature(FeatureFlag.ImageUpload) ? [ComponentType.ImageUpload] : []),
  ],
  container: [
    ComponentType.Group,
    ComponentType.Grid,
    ComponentType.Accordion,
    ComponentType.AccordionGroup,
    ComponentType.ButtonGroup,
    ComponentType.List,
    ComponentType.RepeatingGroup,
  ],
  advanced: [ComponentType.Address, ComponentType.Map, ComponentType.Custom, ComponentType.Subform],
};
export const subformLayoutComponents: Array<FormItemConfigs[ComponentType]> = [
  ...schemaComponents,
  ...textComponents,
  ...advancedItems,
  formItemConfigs[CustomComponentType.CloseSubformButton],
].filter(FilterUtils.filterUnsupportedSubformComponents);

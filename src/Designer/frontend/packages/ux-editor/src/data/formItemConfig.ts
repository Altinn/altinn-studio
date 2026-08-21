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
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FilterUtils } from './FilterUtils';
import type { SerializedComponentDefaults } from '../types/SerializedComponent';

type ConfiguredComponentType<T extends ComponentType | CustomComponentType> =
  T extends CustomComponentType ? ComponentType.CustomButton : T;

export type FormItemConfig<T extends ComponentType | CustomComponentType = ComponentType> = {
  name: ComponentType | CustomComponentType;
  getDisplayName?: (
    formItem: ComponentSpecificConfig<ComponentType>,
  ) => ComponentType | CustomComponentType;
  componentRef?: ComponentType;
  defaultProperties: SerializedComponentDefaults<ConfiguredComponentType<T>>;
  icon?: React.ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }> &
    RefAttributes<SVGSVGElement>;
} & (T extends ContainerComponentType ? { validChildTypes: ComponentType[] } : {});

// ComponentType also contains legacy names (OrganisationLookup, Header) used by ux-editor-v4.
export type FormItemConfigs = {
  [
    T in Exclude<
      ComponentType | CustomComponentType,
      ComponentType.OrganisationLookup | ComponentType.Header
    >
  ]: FormItemConfig<T>;
} & Partial<{
  [ComponentType.OrganisationLookup]: FormItemConfig<ComponentType.OrganisationLookup>;
  [ComponentType.Header]: FormItemConfig<ComponentType.Header>;
}>;

export const formItemConfigs: FormItemConfigs = {
  [ComponentType.Alert]: {
    name: ComponentType.Alert,
    defaultProperties: {
      severity: 'info',
    },
    icon: ExclamationmarkTriangleIcon,
  },
  [ComponentType.Accordion]: {
    name: ComponentType.Accordion,
    defaultProperties: {},
    icon: AccordionIcon,
    validChildTypes: [ComponentType.Paragraph],
  },
  [ComponentType.AccordionGroup]: {
    name: ComponentType.AccordionGroup,
    defaultProperties: {},
    icon: ChevronDownDoubleIcon,
    validChildTypes: [ComponentType.Accordion],
  },
  [ComponentType.ActionButton]: {
    name: ComponentType.ActionButton,
    defaultProperties: {
      buttonStyle: 'primary',
      action: 'instantiate',
    },
    icon: FingerButtonIcon,
  },
  [ComponentType.Address]: {
    name: ComponentType.Address,
    defaultProperties: {
      dataModelBindings: {
        address: '',
        zipCode: '',
        postPlace: '',
      },
      simplified: true,
      saveWhileTyping: 400,
    },
    icon: HouseIcon,
  },
  [ComponentType.AttachmentList]: {
    name: ComponentType.AttachmentList,
    defaultProperties: {},
    icon: PaperclipIcon,
  },
  [ComponentType.Button]: {
    name: ComponentType.Button,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  [ComponentType.ButtonGroup]: {
    name: ComponentType.ButtonGroup,
    defaultProperties: {},
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
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    icon: CheckboxIcon,
  },
  [ComponentType.Custom]: {
    name: ComponentType.Custom,
    defaultProperties: {
      tagName: 'tag',
    },
    icon: ElementIcon,
  },
  [ComponentType.CustomButton]: {
    name: ComponentType.CustomButton,
    getDisplayName: ({
      actions,
    }: ComponentSpecificConfig<ComponentType.CustomButton>):
      ComponentType | CustomComponentType => {
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
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      timeStamp: false,
    },
    icon: CalendarIcon,
  },
  [ComponentType.Dropdown]: {
    name: ComponentType.Dropdown,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      optionsId: '',
    },
    icon: SelectIcon,
  },
  [ComponentType.FileUpload]: {
    name: ComponentType.FileUpload,
    defaultProperties: {
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
    },
    icon: PaperclipIcon,
  },
  [ComponentType.FileUploadWithTag]: {
    name: ComponentType.FileUploadWithTag,
    defaultProperties: {
      displayMode: 'list',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 25,
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 1,
      optionsId: '',
    },
    icon: PaperclipIcon,
  },
  [ComponentType.Grid]: {
    name: ComponentType.Grid,
    defaultProperties: {
      rows: [],
    },
    icon: TableIcon,
  },
  [ComponentType.Group]: {
    name: ComponentType.Group,
    defaultProperties: {},
    icon: GroupIcon,
    validChildTypes: Object.values(ComponentType),
  },
  // The current editor uses the renamed contract; ux-editor-v4 retains Header.
  [ComponentType.Heading]: {
    name: ComponentType.Heading,
    defaultProperties: {
      size: 'L',
    },
    icon: TitleIcon,
  },
  [ComponentType.IFrame]: {
    name: ComponentType.IFrame,
    defaultProperties: {
      sandbox: {},
    },
    icon: PresentationIcon,
  },
  [ComponentType.Image]: {
    name: ComponentType.Image,
    defaultProperties: {
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    },
    icon: ImageIcon,
  },
  [ComponentType.ImageUpload]: {
    name: ComponentType.ImageUpload,
    defaultProperties: {
      crop: {
        shape: 'circle',
        diameter: 250,
      },
    },
    icon: ImageIcon,
  },
  [ComponentType.Input]: {
    name: ComponentType.Input,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    icon: ShortTextIcon,
  },
  [ComponentType.InstanceInformation]: {
    name: ComponentType.InstanceInformation,
    defaultProperties: {},
    icon: InformationSquareIcon,
  },
  [ComponentType.InstantiationButton]: {
    name: ComponentType.InstantiationButton,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  [ComponentType.Likert]: {
    name: ComponentType.Likert,
    defaultProperties: {
      dataModelBindings: {
        questions: '',
        answer: '',
      },
    },
    icon: LikertIcon,
  },
  [ComponentType.Link]: {
    name: ComponentType.Link,
    defaultProperties: {
      style: 'link',
    },
    icon: LinkIcon,
  },
  [ComponentType.List]: {
    name: ComponentType.List,
    defaultProperties: {
      dataModelBindings: {},
      tableHeaders: {},
      dataListId: '',
    },
    icon: TasklistIcon,
  },
  [ComponentType.Map]: {
    name: ComponentType.Map,
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
    icon: PinIcon,
  },
  [ComponentType.MultipleSelect]: {
    name: ComponentType.MultipleSelect,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
      optionsId: '',
    },
    icon: SelectIcon,
  },
  [ComponentType.NavigationBar]: {
    name: ComponentType.NavigationBar,
    defaultProperties: {},
    icon: NavBarIcon,
  },
  [ComponentType.NavigationButtons]: {
    name: ComponentType.NavigationButtons,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  // The current editor uses the renamed contract; ux-editor-v4 retains OrganisationLookup.
  [ComponentType.OrganizationLookup]: {
    name: ComponentType.OrganizationLookup,
    defaultProperties: {
      dataModelBindings: {
        organization_lookup_orgnr: '',
      },
    },
    icon: ShortTextIcon,
  },
  [ComponentType.Panel]: {
    name: ComponentType.Panel,
    defaultProperties: {
      variant: FormPanelVariant.Info,
      showIcon: true,
    },
    icon: FileTextIcon,
  },
  [ComponentType.Paragraph]: {
    name: ComponentType.Paragraph,
    defaultProperties: {},
    icon: TextIcon,
  },
  [ComponentType.Payment]: {
    name: ComponentType.Payment,
    defaultProperties: {},
    icon: WalletIcon,
  },
  [ComponentType.PaymentDetails]: {
    name: ComponentType.PaymentDetails,
    defaultProperties: {},
    icon: PaymentDetailsIcon,
  },
  [ComponentType.PersonLookup]: {
    name: ComponentType.PersonLookup,
    defaultProperties: {
      dataModelBindings: {
        person_lookup_ssn: '',
      },
    },
    icon: ShortTextIcon,
  },
  [ComponentType.PrintButton]: {
    name: ComponentType.PrintButton,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  [ComponentType.RadioButtons]: {
    name: ComponentType.RadioButtons,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    icon: RadioButtonIcon,
  },
  [ComponentType.RepeatingGroup]: {
    name: ComponentType.RepeatingGroup,
    defaultProperties: {
      dataModelBindings: {
        group: '',
      },
    },
    icon: RepeatingGroupIcon,
    validChildTypes: Object.values(ComponentType),
  },
  [ComponentType.Subform]: {
    name: ComponentType.Subform,
    defaultProperties: {
      layoutSet: '',
      tableColumns: [],
    },
    icon: ClipboardIcon,
  },
  [ComponentType.Summary]: {
    name: ComponentType.Summary,
    defaultProperties: {
      componentRef: '',
    },
    icon: FileTextIcon,
  },
  [ComponentType.Summary2]: {
    name: ComponentType.Summary2,
    defaultProperties: {
      target: {
        type: 'layoutSet',
      },
    },
    icon: FileTextIcon,
  },
  [ComponentType.Text]: {
    name: ComponentType.Text,
    defaultProperties: {
      value: '',
    },
    icon: TextIcon,
  },
  [ComponentType.TextArea]: {
    name: ComponentType.TextArea,
    defaultProperties: {
      dataModelBindings: {
        simpleBinding: '',
      },
    },
    icon: LongTextIcon,
  },
  [ComponentType.Divider]: {
    name: ComponentType.Divider,
    defaultProperties: {},
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
  formItemConfigs[ComponentType.OrganizationLookup],
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
  formItemConfigs[ComponentType.ImageUpload],
  formItemConfigs[ComponentType.Link],
  formItemConfigs[ComponentType.IFrame],
  formItemConfigs[ComponentType.InstanceInformation],
  formItemConfigs[ComponentType.Summary2],
].filter(FilterUtils.filterOutDisabledFeatureItems);

export const textComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Heading],
  formItemConfigs[ComponentType.Paragraph],
  formItemConfigs[ComponentType.Panel],
  formItemConfigs[ComponentType.Alert],
  formItemConfigs[ComponentType.Text],
];

export const confOnScreenComponents: FormItemConfigs[ComponentType][] = [
  formItemConfigs[ComponentType.Heading],
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
  ComponentType.Heading,
  ComponentType.Paragraph,
  ComponentType.Button,
];

export const allComponents: KeyValuePairs<ComponentType[]> = {
  form: [
    ComponentType.Input,
    ComponentType.TextArea,
    ComponentType.Datepicker,
    ComponentType.OrganizationLookup,
    ComponentType.PersonLookup,
  ],
  text: [
    ComponentType.Heading,
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
    ComponentType.ImageUpload,
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

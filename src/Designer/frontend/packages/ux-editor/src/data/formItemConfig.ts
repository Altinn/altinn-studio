import type React from 'react';
import { type RefAttributes, type SVGProps } from 'react';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
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
import type { ComponentConfig } from '../types/ComponentConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FilterUtils } from './FilterUtils';
import type { SerializedComponentDefaults } from '../types/SerializedComponent';

type ConfiguredComponentType<T extends ComponentType | ComponentPreset> = T extends ComponentPreset
  ? ComponentType.CustomButton
  : T;

export type FormItemConfig<T extends ComponentType | ComponentPreset = ComponentType> = {
  name: ComponentType | ComponentPreset;
  getDisplayName?: (formItem: ComponentConfig<ComponentType>) => ComponentType | ComponentPreset;
  componentRef?: ComponentType;
  defaultProperties: SerializedComponentDefaults<ConfiguredComponentType<T>>;
  icon?: React.ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }> &
    RefAttributes<SVGSVGElement>;
} & (T extends ContainerComponentType ? { validChildTypes: ComponentType[] } : {});

export type FormItemConfigs = {
  [T in ComponentType]: FormItemConfig<T>;
};

export type ComponentPresetConfigs = {
  [T in ComponentPreset]: FormItemConfig<T>;
};

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
    }: ComponentConfig<ComponentType.CustomButton>): ComponentType | ComponentPreset => {
      const isCloseSubformAction =
        actions?.length === 1 &&
        actions[0]?.id === 'closeSubform' &&
        actions[0]?.type === 'ClientAction';

      return isCloseSubformAction ? ComponentPreset.CloseSubformButton : ComponentType.CustomButton;
    },
    defaultProperties: {
      actions: [],
      buttonStyle: 'primary',
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
      variant: 'info',
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
  [ComponentType.AddToList]: {
    name: ComponentType.AddToList,
    defaultProperties: { title: '', dataModelBindings: { data: '' } },
    icon: TasklistIcon,
  },
  [ComponentType.Audio]: {
    name: ComponentType.Audio,
    defaultProperties: {},
    icon: PresentationIcon,
  },
  [ComponentType.Cards]: {
    name: ComponentType.Cards,
    defaultProperties: { color: 'neutral', cards: [] },
    icon: PresentationIcon,
  },
  [ComponentType.Date]: {
    name: ComponentType.Date,
    defaultProperties: { value: '' },
    icon: CalendarIcon,
  },
  [ComponentType.Number]: {
    name: ComponentType.Number,
    defaultProperties: { value: 0 },
    icon: ShortTextIcon,
  },
  [ComponentType.Option]: {
    name: ComponentType.Option,
    defaultProperties: { value: '' },
    icon: RadioButtonIcon,
  },
  [ComponentType.PDFPreviewButton]: {
    name: ComponentType.PDFPreviewButton,
    defaultProperties: { buttonStyle: 'secondary' },
    icon: FileTextIcon,
  },
  [ComponentType.SigneeList]: {
    name: ComponentType.SigneeList,
    defaultProperties: {},
    icon: TasklistIcon,
  },
  [ComponentType.SigningActions]: {
    name: ComponentType.SigningActions,
    defaultProperties: {},
    icon: FingerButtonIcon,
  },
  [ComponentType.SigningDocumentList]: {
    name: ComponentType.SigningDocumentList,
    defaultProperties: {},
    icon: FileTextIcon,
  },
  [ComponentType.SimpleTable]: {
    name: ComponentType.SimpleTable,
    defaultProperties: { title: '', columns: [] },
    icon: TableIcon,
  },
  [ComponentType.Tabs]: {
    name: ComponentType.Tabs,
    defaultProperties: { tabs: [] },
    icon: PresentationIcon,
  },
  [ComponentType.TimePicker]: {
    name: ComponentType.TimePicker,
    defaultProperties: { dataModelBindings: { simpleBinding: '' } },
    icon: CalendarIcon,
  },
  [ComponentType.Video]: {
    name: ComponentType.Video,
    defaultProperties: {},
    icon: PresentationIcon,
  },
  [ComponentType.Divider]: {
    name: ComponentType.Divider,
    defaultProperties: {},
    icon: MinusIcon,
  },
};

export const componentPresetConfigs: ComponentPresetConfigs = {
  [ComponentPreset.CloseSubformButton]: {
    name: ComponentPreset.CloseSubformButton,
    componentRef: ComponentType.CustomButton,
    defaultProperties: {
      actions: [{ type: 'ClientAction', id: 'closeSubform' }],
    },
    icon: FingerButtonIcon,
  },
};

export function getFormItemConfig<T extends ComponentType | ComponentPreset>(
  type: T,
): FormItemConfig<T> {
  return (
    type in componentPresetConfigs
      ? componentPresetConfigs[type as ComponentPreset]
      : formItemConfigs[type as ComponentType]
  ) as FormItemConfig<T>;
}

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
  formItemConfigs[ComponentType.Tabs],
  formItemConfigs[ComponentType.SigneeList],
  formItemConfigs[ComponentType.SigningActions],
  formItemConfigs[ComponentType.SigningDocumentList],
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
  formItemConfigs[ComponentType.TimePicker],
  formItemConfigs[ComponentType.Divider],
  formItemConfigs[ComponentType.FileUpload],
  formItemConfigs[ComponentType.FileUploadWithTag],
  formItemConfigs[ComponentType.Button],
  formItemConfigs[ComponentType.CustomButton],
  formItemConfigs[ComponentType.NavigationButtons],
  formItemConfigs[ComponentType.PrintButton],
  formItemConfigs[ComponentType.PDFPreviewButton],
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
  formItemConfigs[ComponentType.Date],
  formItemConfigs[ComponentType.Number],
  formItemConfigs[ComponentType.Option],
  formItemConfigs[ComponentType.Audio],
  formItemConfigs[ComponentType.Video],
  formItemConfigs[ComponentType.Cards],
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
    ComponentType.TimePicker,
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
    ComponentType.Date,
    ComponentType.Number,
    ComponentType.Option,
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
    ComponentType.Audio,
    ComponentType.Video,
    ComponentType.Cards,
  ],
  button: [
    ComponentType.Button,
    ComponentType.CustomButton,
    ComponentType.NavigationButtons,
    ComponentType.PrintButton,
    ComponentType.PDFPreviewButton,
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
    ComponentType.Tabs,
  ],
  advanced: [
    ComponentType.Address,
    ComponentType.Map,
    ComponentType.Custom,
    ComponentType.Subform,
    ComponentType.SigneeList,
    ComponentType.SigningActions,
    ComponentType.SigningDocumentList,
    ComponentType.AddToList,
    ComponentType.SimpleTable,
  ],
};
export const subformLayoutComponents: Array<FormItemConfigs[ComponentType]> = [
  ...schemaComponents,
  ...textComponents,
  ...advancedItems,
  componentPresetConfigs[ComponentPreset.CloseSubformButton],
].filter(FilterUtils.filterUnsupportedSubformComponents);

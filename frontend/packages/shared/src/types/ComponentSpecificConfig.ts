import type { ComponentType } from './ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { MapLayer } from 'app-shared/types/MapLayer';
import type { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import type { HeadingLevel } from 'app-shared/types/HeadingLevel';
import type { ActionButtonAction } from 'app-shared/types/ActionButtonAction';
import type { GridRow } from 'app-shared/types/GridRow';
import type { HTMLAutoCompleteValue } from 'app-shared/types/HTMLAutoCompleteValue';
import type { BooleanExpression, StringExpression } from '@studio/components-legacy';
import type {
  IDataModelBindings,
  IDataModelBindingsKeyValue,
} from '@altinn/ux-editor/types/global';

type DataModelBindingsForAddress = {
  address: IDataModelBindings;
  zipCode: IDataModelBindings;
  postPlace: IDataModelBindings;
  careOf?: IDataModelBindings;
  houseNumber?: IDataModelBindings;
};

type DataModelBindingsForCustom = IDataModelBindingsKeyValue;

type DataModelBindingsForGroup = {
  group: IDataModelBindings;
};

type DataModelBindingsForList = IDataModelBindingsKeyValue;

type DataModelBindingsLikert = {
  answer: IDataModelBindings;
  questions: IDataModelBindings;
};

type DataModelBindingsList = {
  list: IDataModelBindings;
};

type DataModelBindingsOptionsSimple = {
  simpleBinding: IDataModelBindings;
  metadata?: IDataModelBindings;
};

export type DataModelBindingsSimple = {
  simpleBinding: IDataModelBindings;
};

type DataModelBindingsForFileUpload = DataModelBindingsSimple | DataModelBindingsList;

type DataModelBindingsOrganisationLookup = {
  organisation_lookup_orgnr: IDataModelBindings;
  organisation_lookup_name?: IDataModelBindings;
};

type DataModelBindingsPersonLookup = {
  person_lookup_ssn: IDataModelBindings;
  person_lookup_name: IDataModelBindings;
};

type Option<T extends string | boolean | number = string | boolean | number> = {
  label: string;
  value: T;
  description?: string;
  helpText?: string;
};

type SelectionComponent = {
  optionsId?: string;
  mapping?: KeyValuePairs;
  queryParameters?: KeyValuePairs;
  options?: Option[];
  secure?: boolean;
  sortOrder?: 'asc' | 'desc';
  source?: {
    group: string;
    label: StringExpression;
    value: string;
    description?: StringExpression;
    helpText?: StringExpression;
  };
};

type SelectionComponentFull = SelectionComponent & {
  preselectedOptionIndex?: number;
};

type FileUploadComponentBase = {
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
  alertOnDelete?: BooleanExpression;
};

type FormComponentProps = {
  readOnly?: BooleanExpression;
  required?: BooleanExpression;
  showValidation?: AllowedValidationMasks;
};

type AllowedValidationMasks =
  | 'Schema'
  | 'Component'
  | 'Expression'
  | 'CustomBackend'
  | 'Required'
  | 'AllExceptRequired'
  | 'All';

type SummarizableComponentProps = {
  renderAsSummary?: BooleanExpression;
};

type LabeledComponentProps = {
  labelSettings?: LabelSettings;
};

type LabelSettings = {
  optionalIndicator?: boolean;
};

type ButtonStyle = 'primary' | 'secondary';
type LayoutStyle = 'column' | 'row' | 'table';

type ClientActionId = 'nextPage' | 'previousPage' | 'navigateToPage' | 'closeSubform';
type ClientAction<T extends ClientActionId = ClientActionId> = {
  id: T;
  type: 'ClientAction';
};
type ServerAction = {
  id: string;
  type: 'ServerAction';
};
type CustomAction = ClientAction | ServerAction;

type PageValidation = {
  page: 'current' | 'currentAndPrevious' | 'all';
  show: AllowedValidationMasks;
};

export type OverrideDisplayType = 'list' | 'string';
export type OverrideDisplay = 'table' | 'full';
export type Summary2OverrideConfig = {
  componentId: string;
  hidden?: boolean;
  emptyFieldText?: string;
  isCompact?: boolean;
  displayType?: OverrideDisplayType;
  display?: OverrideDisplay;
};

export type SummaryTargetType = 'page' | 'layoutSet' | 'component';

export type Summary2TargetConfig = {
  type?: SummaryTargetType;
  id?: string;
  taskId?: string;
};

export type ComponentSpecificConfig<T extends ComponentType = ComponentType> = {
  [ComponentType.Alert]: { severity: 'success' | 'info' | 'warning' | 'danger' };
  [ComponentType.Accordion]: { headingLevel?: HeadingLevel };
  [ComponentType.AccordionGroup]: SummarizableComponentProps;
  [ComponentType.ActionButton]: {
    buttonStyle: ButtonStyle;
    action: ActionButtonAction;
  };
  [ComponentType.Address]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps & {
      dataModelBindings: DataModelBindingsForAddress;
      simplified?: boolean;
      saveWhileTyping?: number;
    };
  [ComponentType.AttachmentList]: { dataTypeIds?: string[] };
  [ComponentType.Button]: {
    mode?: 'submit' | 'save' | 'go-to-task' | 'instantiate';
    taskId?: string;
    mapping?: KeyValuePairs;
  };
  [ComponentType.ButtonGroup]: SummarizableComponentProps & LabeledComponentProps;
  [ComponentType.Checkboxes]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    SelectionComponentFull & {
      dataModelBindings: DataModelBindingsOptionsSimple;
      layout?: LayoutStyle;
      alertOnChange?: BooleanExpression;
    };
  [ComponentType.Custom]: FormComponentProps &
    SummarizableComponentProps & {
      dataModelBindings?: DataModelBindingsForCustom;
      tagName: string;
      [id: string]: any;
    };
  [ComponentType.CustomButton]: {
    actions: CustomAction[];
    buttonStyle: ButtonStyle;
  };
  [ComponentType.Datepicker]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps & {
      dataModelBindings: DataModelBindingsSimple;
      minDate?: string;
      maxDate?: string;
      timeStamp?: boolean;
      format?: string;
    };
  [ComponentType.Dropdown]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    SelectionComponentFull & {
      dataModelBindings: DataModelBindingsOptionsSimple;
    };
  [ComponentType.FileUpload]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    FileUploadComponentBase & { dataModelBindings?: DataModelBindingsForFileUpload };
  [ComponentType.FileUploadWithTag]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    FileUploadComponentBase & {
      dataModelBindings?: DataModelBindingsForFileUpload;
      optionsId: string;
    };
  [ComponentType.Grid]: SummarizableComponentProps & LabeledComponentProps & { rows: GridRow[] };
  [ComponentType.Group]: SummarizableComponentProps & {
    groupingIndicator?: 'indented' | 'panel';
    maxCount?: number;
  };
  [ComponentType.Header]: { size: string };
  [ComponentType.IFrame]: {
    sandbox?: {
      allowPopups?: boolean;
      allowPopupsToEscapeSandbox?: boolean;
    };
  };
  [ComponentType.Image]: {
    image?: {
      src?: KeyValuePairs<string>;
      align?: string | null;
      width?: string;
    };
  };
  [ComponentType.Input]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps & {
      dataModelBindings: DataModelBindingsSimple;
      saveWhileTyping?: number;
      formatting?: {
        currency?: string;
        unit?: string;
        position?: 'prefix' | 'suffix';
        number?:
          | {
              format: string;
              mask?: string | string[];
              allowEmptyFormatting?: boolean;
              patternChar?: string;
            }
          | {
              thousandSeparator?: string;
              decimalSeparator?: string;
              allowedDecimalSeparators?: string[];
              thousandsGroupStyle?: 'thousand' | 'lakh' | 'wan' | 'none';
              decimalScale?: number;
              fixedDecimalScale?: boolean;
              allowNegative?: boolean;
              allowLeadingZeros?: boolean;
              suffix?: string;
              prefix?: string;
            };
        align?: 'right' | 'center' | 'left';
      };
      variant?: 'text' | 'search';
      autocomplete?: HTMLAutoCompleteValue;
      maxLength?: number;
    };
  [ComponentType.InstanceInformation]: LabeledComponentProps & {
    elements?: {
      dateSent?: boolean;
      sender?: boolean;
      receiver?: boolean;
      referenceNumber?: boolean;
    }[];
  };
  [ComponentType.InstantiationButton]: { mapping?: KeyValuePairs };
  [ComponentType.Likert]: FormComponentProps &
    SummarizableComponentProps &
    SelectionComponent & {
      dataModelBindings: DataModelBindingsLikert;
      filter?: { key: 'start' | 'stop'; value: string | number };
    };
  [ComponentType.Link]: {
    style: 'primary' | 'secondary' | 'link';
    openInNewTab?: boolean;
  };
  [ComponentType.List]: FormComponentProps &
    SummarizableComponentProps & {
      dataModelBindings: DataModelBindingsForList;
      tableHeaders: KeyValuePairs;
      sortableColumns?: string[];
      pagination?: {
        alternatives: number[];
        default: number;
      };
      dataListId: string;
      secure?: boolean;
      mapping?: KeyValuePairs;
      bindingToShowInSummary?: string;
      tableHeadersMobile?: string[];
    };

  [ComponentType.Map]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps & {
      dataModelBindings: DataModelBindingsSimple;
      centerLocation?: {
        latitude: number;
        longitude: number;
      };
      zoom?: number;
      layers?: MapLayer[];
    };
  [ComponentType.MultipleSelect]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    SelectionComponentFull & { dataModelBindings: DataModelBindingsOptionsSimple };
  [ComponentType.NavigationBar]: {
    compact?: boolean;
    validateOnForward?: PageValidation;
    validateOnBackward?: PageValidation;
  };
  [ComponentType.NavigationButtons]: {
    showBackButton?: boolean;
    validateOnNext?: PageValidation;
    validateOnPrevious?: PageValidation;
  };
  [ComponentType.OrganisationLookup]: FormComponentProps &
    SummarizableComponentProps & {
      dataModelBindings: DataModelBindingsOrganisationLookup;
    };
  [ComponentType.Panel]: {
    variant?: FormPanelVariant;
    showIcon?: boolean;
  };
  [ComponentType.Paragraph]: {};
  [ComponentType.Payment]: SummarizableComponentProps;
  [ComponentType.PaymentDetails]: {};
  [ComponentType.PersonLookup]: FormComponentProps &
    SummarizableComponentProps & {
      dataModelBindings: DataModelBindingsPersonLookup;
    };
  [ComponentType.PrintButton]: {};
  [ComponentType.RadioButtons]: FormComponentProps &
    SummarizableComponentProps &
    SelectionComponentFull &
    LabeledComponentProps & {
      dataModelBindings: DataModelBindingsOptionsSimple;
      layout?: LayoutStyle;
      alertOnChange?: BooleanExpression;
      showAsCard?: boolean;
    };
  [ComponentType.RepeatingGroup]: SummarizableComponentProps & {
    dataModelBindings: DataModelBindingsForGroup;
    validateOnSaveRow?: AllowedValidationMasks;
    edit?: {
      mode?: string;
      addButton?: BooleanExpression;
      saveButton?: BooleanExpression;
      deleteButton?: BooleanExpression;
      editButton?: BooleanExpression;
      multiPage?: boolean;
      openByDefault?: boolean | 'first' | 'last';
      alertOnDelete?: BooleanExpression;
      saveAndNextButton?: BooleanExpression;
      alwaysShowAddButton?: boolean;
    };
    maxCount?: number;
    minCount?: number;
    tableHeaders?: string[];
    tableColumns?: KeyValuePairs;
    hiddenRow?: BooleanExpression;
    rowsBefore?: GridRow[];
    rowsAfter?: GridRow[];
    labelSettings?: LabelSettings;
  };
  [ComponentType.Subform]: FormComponentProps;
  [ComponentType.Summary]: SummarizableComponentProps & {
    componentRef: string;
    largeGroup?: boolean;
    excludedChildren?: string[];
    display?: {
      hideChangeButton?: boolean;
      hideValidationMessages?: boolean;
      useComponentGrid?: boolean;
      hideBottomBorder?: boolean;
    };
  };
  [ComponentType.Summary2]: {
    target: Summary2TargetConfig;
    showPageInAccordion?: boolean;
    hideEmptyFields?: boolean;
    overrides?: Summary2OverrideConfig[];
  };
  [ComponentType.TextArea]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps & {
      dataModelBindings: DataModelBindingsSimple;
      saveWhileTyping?: number;
      autocomplete?: HTMLAutoCompleteValue;
      maxLength?: number;
    };
  [ComponentType.Divider]: {};
}[T];

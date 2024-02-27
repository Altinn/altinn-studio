import type { ComponentType } from './ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { MapLayer } from 'app-shared/types/MapLayer';
import type { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import type { HeadingLevel } from 'app-shared/types/HeadingLevel';
import type { ActionButtonAction } from 'app-shared/types/ActionButtonAction';
import type { GridRow } from 'app-shared/types/GridRow';
import type { HTMLAutoCompleteValue } from 'app-shared/types/HTMLAutoCompleteValue';

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
    label: string;
    value: string;
    description?: string;
    helpText?: string;
  };
};

type SelectionComponentFull = SelectionComponent & {
  preselectedOptionIndex?: number;
};

type FileUploadComponentBase = {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
  alertOnDelete?: boolean;
};

type FormComponentProps = {
  readonly?: boolean;
  required?: boolean;
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
  renderAsSummary?: boolean;
};

type LabeledComponentProps = {
  labelSettings?: LabelSettings;
};

type LabelSettings = {
  optionalIndicator?: boolean;
};

type ButtonStyle = 'primary' | 'secondary';
type LayoutStyle = 'column' | 'row' | 'table';

type ClientActionId = 'nextPage' | 'previousPage' | 'navigateToPage';
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
      layout?: LayoutStyle;
      alertOnChange?: boolean;
    };
  [ComponentType.Custom]: FormComponentProps &
    SummarizableComponentProps & {
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
      minDate?: string;
      maxDate?: string;
      timeStamp?: boolean;
      format?: string;
    };
  [ComponentType.Dropdown]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    SelectionComponentFull;
  [ComponentType.FileUpload]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    FileUploadComponentBase;
  [ComponentType.FileUploadWithTag]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps &
    FileUploadComponentBase & { optionsId: string };
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
      filter?: { key: 'start' | 'stop'; value: string | number };
    };
  [ComponentType.LikertItem]: FormComponentProps &
    SummarizableComponentProps &
    SelectionComponentFull & {
      layout?: LayoutStyle;
    };
  [ComponentType.Link]: {
    style: 'primary' | 'secondary' | 'link';
    openInNewTab?: boolean;
  };
  [ComponentType.List]: FormComponentProps &
    SummarizableComponentProps & {
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
    SelectionComponentFull;
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
  [ComponentType.Panel]: {
    variant?: FormPanelVariant;
    showIcon?: boolean;
  };
  [ComponentType.Paragraph]: {};
  [ComponentType.PrintButton]: {};
  [ComponentType.RadioButtons]: FormComponentProps &
    SummarizableComponentProps &
    SelectionComponentFull &
    LabeledComponentProps & {
      layout?: LayoutStyle;
      alertOnChange?: boolean;
      showAsCard?: boolean;
    };
  [ComponentType.RepeatingGroup]: SummarizableComponentProps & {
    validateOnSaveRow?: AllowedValidationMasks;
    edit?: {
      mode?: string;
      addButton?: boolean;
      saveButton?: boolean;
      deleteButton?: boolean;
      editButton?: boolean;
      multiPage?: boolean;
      openByDefault?: boolean | 'first' | 'last';
      alertOnDelete?: boolean;
      saveAndNextButton?: boolean;
      alwaysShowAddButton?: boolean;
    };
    maxCount?: number;
    minCount?: number;
    tableHeaders?: string[];
    tableColumns?: KeyValuePairs;
    hiddenRow?: boolean;
    rowsBefore?: GridRow[];
    rowsAfter?: GridRow[];
    labelSettings?: LabelSettings;
  };
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
  [ComponentType.TextArea]: FormComponentProps &
    SummarizableComponentProps &
    LabeledComponentProps & {
      saveWhileTyping?: number;
      autocomplete?: HTMLAutoCompleteValue;
      maxLength?: number;
    };
}[T];

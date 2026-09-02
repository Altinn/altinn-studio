import { CompExternal } from '@app/layout-contract/generated/components.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { CheckboxesSummaryOverridesWithRef } from '@app/layout-contract/generated/components/Checkboxes/config.generated';
import { GridSummaryOverridesWithRef } from '@app/layout-contract/generated/components/Grid/config.generated';
import { MultipleSelectSummaryOverridesWithRef } from '@app/layout-contract/generated/components/MultipleSelect/config.generated';
import { RepeatingGroupSummaryOverridesWithRef } from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';
import { SubformSummaryOverridesWithRef } from '@app/layout-contract/generated/components/Subform/config.generated';

export type AllowedValidationMasks = (
  'Schema' | 'Component' | 'Expression' | 'CustomBackend' | 'Required' | 'AllExceptRequired' | 'All'
)[];

export type AnySummaryOverride =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Address' } & ISummaryOverridesCommon)
  | CheckboxesSummaryOverridesWithRef
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Date' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Datepicker' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Divider' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Dropdown' } & ISummaryOverridesCommon)
  | GridSummaryOverridesWithRef
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Group' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Heading' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'ImageUpload' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Input' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Likert' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'List' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Map' } & ISummaryOverridesCommon)
  | MultipleSelectSummaryOverridesWithRef
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Number' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Option' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'OrganizationLookup' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Paragraph' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Payment' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'PersonLookup' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'RadioButtons' } & ISummaryOverridesCommon)
  | RepeatingGroupSummaryOverridesWithRef
  | SubformSummaryOverridesWithRef
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Tabs' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Text' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'TextArea' } & ISummaryOverridesCommon)
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'TimePicker' } & ISummaryOverridesCommon);

export type ButtonPosition = 'left' | 'center' | 'right';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonTextAlign = 'left' | 'center' | 'right';

export interface ComponentBase {
  id: string;
  hidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  grid?: IGrid;
  pageBreak?: IPageBreak;
}

export interface FormComponentProps {
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  showValidations?: AllowedValidationMasks;
}

export interface GlobalPageSettingsFromSchema {
  hideCloseButton?: boolean;
  showLanguageSelector?: boolean;
  showExpandWidthButton?: boolean;
  expandedWidth?: boolean;
  showProgress?: boolean;
  autoSaveBehavior?: 'onChangeFormData' | 'onChangePage';
  navigationTitle?: ExprValToActualOrExpr<ExprVal.String>;
  taskNavigation?: (NavigationTaskFromSchema | NavigationReceiptFromSchema)[];
  validationOnNavigation?: PageValidation;
  hideAppNameInPdf?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export type GridCell = GridComponentRef | null | GridCellText | GridCellLabelFrom;

export interface GridCellLabelFrom extends ITableColumnProperties {
  labelFrom: string;
  columnOptions?: ITableColumnProperties;
  cellStyle?: IGridColumnProperties;
}

export interface GridCellText extends ITableColumnProperties {
  text: string;
  help?: string;
  columnOptions?: ITableColumnProperties;
  cellStyle?: IGridColumnProperties;
}

export interface GridComponentRef extends ITableColumnProperties {
  component?: string;
  columnOptions?: ITableColumnProperties;
  cellStyle?: IGridColumnProperties;
}

export interface GridRow {
  header?: boolean;
  readOnly?: boolean;
  columnOptions?: ITableColumnProperties;
  cells: GridCell[];
}

export type GridRows = GridRow[];

export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export type HTMLAutoCompleteValues =
  | 'on'
  | 'off'
  | 'name'
  | 'honorific-prefix'
  | 'given-name'
  | 'additional-name'
  | 'family-name'
  | 'honorific-suffix'
  | 'nickname'
  | 'email'
  | 'username'
  | 'new-password'
  | 'current-password'
  | 'one-time-code'
  | 'organization-title'
  | 'organization'
  | 'street-address'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'address-level4'
  | 'address-level3'
  | 'address-level2'
  | 'address-level1'
  | 'country'
  | 'country-name'
  | 'postal-code'
  | 'cc-name'
  | 'cc-given-name'
  | 'cc-additional-name'
  | 'cc-family-name'
  | 'cc-number'
  | 'cc-exp'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-csc'
  | 'cc-type'
  | 'transaction-currency'
  | 'transaction-amount'
  | 'language'
  | 'bday'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'sex'
  | 'tel'
  | 'tel-country-code'
  | 'tel-national'
  | 'tel-area-code'
  | 'tel-local'
  | 'tel-extension'
  | 'impp'
  | 'url'
  | 'photo';

export interface IButtonProps {
  size?: ButtonSize;
  textAlign?: ButtonTextAlign;
  fullWidth?: boolean;
  position?: ButtonPosition;
}

export interface IComponentsSettings {
  excludeFromPdf: string[];
}

export interface IDataModelBindingsLikert {
  answer: IDataModelReference;
  questions: IDataModelReference;
}

export interface IDataModelBindingsList {
  list: IDataModelReference;
}

export interface IDataModelBindingsOptionsSimple {
  simpleBinding: IDataModelReference;
  label?: IDataModelReference;
  metadata?: IDataModelReference;
}

export interface IDataModelBindingsSimple {
  simpleBinding: IDataModelReference;
}

export interface IDataModelReference {
  dataType: string;
  field: string;
}

export interface IFormatting {
  currency?:
    | 'AED'
    | 'AFN'
    | 'ALL'
    | 'AMD'
    | 'ANG'
    | 'AOA'
    | 'ARS'
    | 'AUD'
    | 'AWG'
    | 'AZN'
    | 'BAM'
    | 'BBD'
    | 'BDT'
    | 'BGN'
    | 'BHD'
    | 'BIF'
    | 'BMD'
    | 'BND'
    | 'BOB'
    | 'BOV'
    | 'BRL'
    | 'BSD'
    | 'BTN'
    | 'BWP'
    | 'BYN'
    | 'BZD'
    | 'CAD'
    | 'CDF'
    | 'CHE'
    | 'CHF'
    | 'CHW'
    | 'CLF'
    | 'CLP'
    | 'CNY'
    | 'COP'
    | 'COU'
    | 'CRC'
    | 'CUC'
    | 'CUP'
    | 'CVE'
    | 'CZK'
    | 'DJF'
    | 'DKK'
    | 'DOP'
    | 'DZD'
    | 'EGP'
    | 'ERN'
    | 'ETB'
    | 'EUR'
    | 'FJD'
    | 'FKP'
    | 'GBP'
    | 'GEL'
    | 'GHS'
    | 'GIP'
    | 'GMD'
    | 'GNF'
    | 'GTQ'
    | 'GYD'
    | 'HKD'
    | 'HNL'
    | 'HTG'
    | 'HUF'
    | 'IDR'
    | 'ILS'
    | 'INR'
    | 'IQD'
    | 'IRR'
    | 'ISK'
    | 'JMD'
    | 'JOD'
    | 'JPY'
    | 'KES'
    | 'KGS'
    | 'KHR'
    | 'KMF'
    | 'KPW'
    | 'KRW'
    | 'KWD'
    | 'KYD'
    | 'KZT'
    | 'LAK'
    | 'LBP'
    | 'LKR'
    | 'LRD'
    | 'LSL'
    | 'LYD'
    | 'MAD'
    | 'MDL'
    | 'MGA'
    | 'MKD'
    | 'MMK'
    | 'MNT'
    | 'MOP'
    | 'MRU'
    | 'MUR'
    | 'MVR'
    | 'MWK'
    | 'MXN'
    | 'MXV'
    | 'MYR'
    | 'MZN'
    | 'NAD'
    | 'NGN'
    | 'NIO'
    | 'NOK'
    | 'NPR'
    | 'NZD'
    | 'OMR'
    | 'PAB'
    | 'PEN'
    | 'PGK'
    | 'PHP'
    | 'PKR'
    | 'PLN'
    | 'PYG'
    | 'QAR'
    | 'RON'
    | 'RSD'
    | 'RUB'
    | 'RWF'
    | 'SAR'
    | 'SBD'
    | 'SCR'
    | 'SDG'
    | 'SEK'
    | 'SGD'
    | 'SHP'
    | 'SLE'
    | 'SLL'
    | 'SOS'
    | 'SRD'
    | 'SSP'
    | 'STN'
    | 'SVC'
    | 'SYP'
    | 'SZL'
    | 'THB'
    | 'TJS'
    | 'TMT'
    | 'TND'
    | 'TOP'
    | 'TRY'
    | 'TTD'
    | 'TWD'
    | 'TZS'
    | 'UAH'
    | 'UGX'
    | 'USD'
    | 'USN'
    | 'UYI'
    | 'UYU'
    | 'UYW'
    | 'UZS'
    | 'VED'
    | 'VES'
    | 'VND'
    | 'VUV'
    | 'WST'
    | 'XAF'
    | 'XCD'
    | 'XDR'
    | 'XOF'
    | 'XPF'
    | 'XSU'
    | 'XUA'
    | 'YER'
    | 'ZAR'
    | 'ZMW'
    | 'ZWL';
  unit?:
    | 'celsius'
    | 'centimeter'
    | 'day'
    | 'degree'
    | 'foot'
    | 'gram'
    | 'hectare'
    | 'hour'
    | 'inch'
    | 'kilogram'
    | 'kilometer'
    | 'liter'
    | 'meter'
    | 'milliliter'
    | 'millimeter'
    | 'millisecond'
    | 'minute'
    | 'month'
    | 'percent'
    | 'second'
    | 'week'
    | 'year';
  position?: 'prefix' | 'suffix';
  number?: PatternFormatProps | NumberFormatProps;
  align?: 'right' | 'center' | 'left';
}

export interface IGrid extends IGridStyling {
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
  validationGrid?: IGridStyling;
}

export interface IGridColumnProperties {
  colSpan?: ExprValToActualOrExpr<ExprVal.Number>;
}

export type IGridSize = 'auto' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface IGridStyling {
  xs?: IGridSize;
  sm?: IGridSize;
  md?: IGridSize;
  lg?: IGridSize;
}

export interface ILabelSettings {
  optionalIndicator?: boolean;
}

export interface ILayoutFile {
  $schema?: string;
  data: {
    layout: CompExternal[];
    hidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
    expandedWidth?: boolean;
    validationOnNavigation?: PageValidation;
  };
}

export interface ILayoutSettings {
  $schema?: string;
  pages: IPagesSettings;
  components?: IComponentsSettings;
  defaultDataType?: string;
  type?: string;
}

export interface ILikertColumnProperties {
  columns?: { value: string | number; divider?: 'before' | 'after' | 'both' }[];
}

export interface IMapping {
  [key: string]: string;
}

export interface INavigationBasePageGroup {
  id: string;
  type?: 'default' | 'info';
  markWhenCompleted?: boolean;
  expandedByDefault?: boolean;
}

export interface IOptionSource {
  dataType?: string;
  group: string;
  label: ExprValToActualOrExpr<ExprVal.String>;
  value: string;
  description?: ExprValToActualOrExpr<ExprVal.String>;
  helpText?: ExprValToActualOrExpr<ExprVal.String>;
}

export interface IPageBreak {
  breakBefore?: ExprValToActualOrExpr<ExprVal.String>;
  breakAfter?: ExprValToActualOrExpr<ExprVal.String>;
}

export interface IPagesBaseSettings {
  excludeFromPdf?: string[];
  pdfLayoutName?: string;
}

export type IPagesSettings = IPagesSettingsWithOrder | IPagesSettingsWithGroups;

export interface IPagesSettingsWithGroups extends GlobalPageSettingsFromSchema, IPagesBaseSettings {
  groups: NavigationPageGroup[];
}

export interface IPagesSettingsWithOrder extends GlobalPageSettingsFromSchema, IPagesBaseSettings {
  order: string[];
}

export interface IQueryParameters {
  [key: string]: ExprValToActualOrExpr<ExprVal.String>;
}

export type IRawDataModelBinding = string | IDataModelReference;

export interface IRawOption {
  label: string;
  value: string | number | boolean | null;
  description?: string;
  helpText?: string;
}

export interface ISelectionComponent {
  optionsId?: string;
  queryParameters?: IQueryParameters;
  options?: IRawOption[];
  secure?: boolean;
  sortOrder?: 'asc' | 'desc';
  source?: IOptionSource;
  optionFilter?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export interface ISelectionComponentFull extends ISelectionComponent {
  preselectedOptionIndex?: number;
}

export interface ISummaryOverridesCommon {
  hidden?: boolean;
  emptyFieldText?: string;
}

export interface ITableColumnFormatting {
  [key: string]: ITableColumnProperties;
}

export interface ITableColumnProperties {
  width?: string;
  alignText?: ITableColumnsAlignText;
  textOverflow?: ITableColumnsTextOverflow;
  hidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export type ITableColumnsAlignText = 'left' | 'center' | 'right';

export interface ITableColumnsTextOverflow {
  lineWrap?: boolean;
  maxHeight?: number;
}

export interface LabeledComponentProps {
  labelSettings?: ILabelSettings;
}

export enum LayoutStyle {
  Column = 'column',
  Row = 'row',
  Table = 'table',
}

export type NavigationPageGroup = NavigationPageGroupMultiple | NavigationPageGroupSingle;

export interface NavigationPageGroupMultiple extends INavigationBasePageGroup {
  name: string;
  order: string[];
}

export interface NavigationPageGroupSingle extends INavigationBasePageGroup {
  order: string[];
}

export interface NavigationReceiptFromSchema {
  id: string;
  name?: string;
  type: 'receipt';
}

export interface NavigationTaskFromSchema {
  id: string;
  name?: string;
  taskId: string;
}

export interface NumberFormatProps {
  thousandSeparator?:
    ExprValToActualOrExpr<ExprVal.Boolean> | ExprValToActualOrExpr<ExprVal.String>;
  decimalSeparator?: ExprValToActualOrExpr<ExprVal.String>;
  allowedDecimalSeparators?: string[];
  thousandsGroupStyle?: 'thousand' | 'lakh' | 'wan' | 'none';
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  allowNegative?: boolean;
  allowLeadingZeros?: boolean;
  suffix?: ExprValToActualOrExpr<ExprVal.String>;
  prefix?: ExprValToActualOrExpr<ExprVal.String>;
}

export interface PageValidation {
  page: 'current' | 'currentAndPrevious' | 'all';
  show: AllowedValidationMasks;
}

export interface PatternFormatProps {
  format: ExprValToActualOrExpr<ExprVal.String>;
  mask?: string | string[];
  allowEmptyFormatting?: boolean;
  patternChar?: string;
}

/**
 * Beware, this used to be a number OR boolean value in v3.
 * It can be smart to check the type of this value before using it.
 */
export type SaveWhileTyping = number;

export interface SummarizableComponentProps {
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export interface TRBFormComp {
  tableTitle?: ExprValToActualOrExpr<ExprVal.String>;
  shortName?: ExprValToActualOrExpr<ExprVal.String>;
  requiredValidation?: ExprValToActualOrExpr<ExprVal.String>;
}

export interface TRBLabel {
  title?: ExprValToActualOrExpr<ExprVal.String>;
  description?: ExprValToActualOrExpr<ExprVal.String>;
  help?: ExprValToActualOrExpr<ExprVal.String>;
}

export interface TRBSummarizable {
  summaryTitle?: ExprValToActualOrExpr<ExprVal.String>;
  summaryAccessibleTitle?: ExprValToActualOrExpr<ExprVal.String>;
}

// Source hash: aa97438caa1a24d90e781cab15a32b10483a7767b1343fb9025a55f3988ae0ed

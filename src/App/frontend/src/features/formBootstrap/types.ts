import type { JSONSchema7 } from 'json-schema';

import type { DataModelSchemaResult } from 'src/features/datamodel/SchemaLookupTool';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { BackendValidationIssue, IExpressionValidations } from 'src/features/validation';
import type { ILayoutSettings, NavigationPageGroup } from 'src/layout/common.generated';
import type { ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface DataModelInfo {
  schema: JSONSchema7;
  initialData: object;
  dataElementId: string | null;
  isWritable: boolean;
  expressionValidationConfig: IExpressionValidations | null;
  initialValidationIssues?: BackendValidationIssue[] | null;
}

export interface StaticOptionsVariant {
  queryParameters: Record<string, string>;
  options: IOptionInternal[];
}

export interface StaticOptionsInfo {
  variants: StaticOptionsVariant[];
}

export interface FormBootstrapMetadata {
  layoutSetId: string;
  defaultDataType: string;
  isSubform?: boolean;
  isPdf?: boolean;
}

export interface FormBootstrapResponse {
  schemaVersion: number;
  layouts: ILayoutCollection;
  layoutSettings: ILayoutSettings | null;
  dataModels: Record<string, DataModelInfo>;
  staticOptions: Record<string, StaticOptionsInfo>;
  validationIssues?: BackendValidationIssue[] | null;
  metadata: FormBootstrapMetadata;
}

export interface ProcessedLayoutSettings {
  order: string[];
  groups?: NavigationPageGroup[];
  pageSettings: Partial<GlobalPageSettings>;
  pdfLayoutName?: string;
}

export interface ProcessedDataModelInfo extends DataModelInfo {
  schemaResult: DataModelSchemaResult;
}

export interface FormBootstrapContextValue {
  schemaVersion: number;
  layouts: ILayouts;
  layoutLookups: LayoutLookups;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
  layoutSettings: ProcessedLayoutSettings;
  dataModels: Record<string, ProcessedDataModelInfo>;
  defaultDataType: string;
  allDataTypes: string[];
  writableDataTypes: string[];
  staticOptions: Record<string, StaticOptionsInfo>;
  initialValidationIssues?: BackendValidationIssue[] | null;
  metadata: FormBootstrapMetadata;
}

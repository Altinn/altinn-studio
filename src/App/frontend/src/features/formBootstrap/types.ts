import type { JSONSchema7 } from 'json-schema';

import type { DataModelSchemaResult } from 'src/features/datamodel/SchemaLookupTool';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { BackendValidationIssue, IExpressionValidations } from 'src/features/validation';
import type { ILayoutSettings } from 'src/layout/common.generated';
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

export interface FormBootstrapResponse {
  layouts: ILayoutCollection;
  layoutSettings: ILayoutSettings | null;
  dataModels: Record<string, DataModelInfo>;
  staticOptions: Record<string, StaticOptionsInfo>;
  validationIssues?: BackendValidationIssue[] | null;
}

export interface ProcessedDataModelInfo extends DataModelInfo {
  schemaResult: DataModelSchemaResult;
}

export interface FormBootstrapContextValue {
  uiFolder: string;
  layouts: ILayouts;
  layoutLookups: LayoutLookups;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
  dataModels: Record<string, ProcessedDataModelInfo>;
  allDataTypes: string[];
  writableDataTypes: string[];
  staticOptions: Record<string, StaticOptionsInfo>;
  initialValidationIssues?: BackendValidationIssue[] | null;
}

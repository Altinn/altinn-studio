import type { JSONSchema7 } from 'json-schema';

import type { DataModelSchemaResult } from 'src/features/datamodel/SchemaLookupTool';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { FormBootstrapQueryResponse } from 'src/features/formBootstrap/useFormBootstrapQuery';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type {
  BackendValidationIssue,
  IExpressionValidationConfig,
  IExpressionValidations,
} from 'src/features/validation';
import type { ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface RawDataModelInfo {
  schema: JSONSchema7;
  initialData: object;
  dataElementId: string | null;
  expressionValidationConfig: IExpressionValidationConfig | null;
  initialValidationIssues?: BackendValidationIssue[] | null;
}

export interface StaticOptionSet {
  options: IOptionInternal[];
  downstreamParameters?: string | null;
}

export interface FormBootstrapResponse {
  layouts: ILayoutCollection;
  dataModels: Record<string, RawDataModelInfo>;
  staticOptions: Record<string, StaticOptionSet>;
  validationIssues?: BackendValidationIssue[] | null;
}

export interface ProcessedDataModelInfo extends Omit<RawDataModelInfo, 'expressionValidationConfig'> {
  expressionValidationConfig: IExpressionValidations | null;
  schemaResult: DataModelSchemaResult;
}

export interface FormBootstrapBase extends Omit<FormBootstrapQueryResponse, 'staticOptions' | 'layouts'> {
  uiFolder: string;
  staticOptions: Record<string, StaticOptionSet>;
}

export interface FormBootstrapContextValue extends FormBootstrapBase {
  layouts: ILayouts;
  layoutLookups: LayoutLookups;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
}

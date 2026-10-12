import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface Columns {
  header: string;
  accessors: string[];
  component?:
    | { type: 'link'; hrefPath: string; textPath: string; openInNewTab?: boolean }
    | { type: 'date'; format?: string }
    | { type: 'radio'; options?: { label: string; value: string }[] };
}

export interface DataConfig {
  id: string;
  path: string;
}

export interface IDataModelBindingsForTable {
  tableData: IRawDataModelBinding;
}

export type CompSimpleTableSerialized = {
  type: 'SimpleTable';
  textResourceBindings?: TRBFormComp & TRBLabel & TRBSummarizable;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  title: string;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForTable;
  columns: Columns[];
  zebra?: boolean;
  enableDelete?: boolean;
  enableEdit?: boolean;
  size?: 'sm' | 'md' | 'lg';
  externalApi?: DataConfig;
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: 94af79cea5533dc4507af372ce106996b39915c3e9e7b0365d33d430f83ae7e4

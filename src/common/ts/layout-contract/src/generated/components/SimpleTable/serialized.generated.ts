import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  SummarizableComponentProps,
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
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
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
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 5e8746319d35f38cd3f0952d5f89f528b62b01b25973053b7b9fadaa66729aa5

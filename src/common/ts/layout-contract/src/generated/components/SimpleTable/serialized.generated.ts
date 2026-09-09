import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: e01c922a4e85655c3cf180ee62d76d05940cf6883c33a76bd3f3654c5b07c4d2

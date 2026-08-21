import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  IDataModelBindingsList,
  IDataModelBindingsSimple,
} from '@app/layout-contract/generated/serialized-common.generated';

export type CompFileUploadSerialized = {
  type: 'FileUpload';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple | IDataModelBindingsList;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: ExprValToActualOrExpr<ExprVal.Number>;
  minNumberOfAttachments: ExprValToActualOrExpr<ExprVal.Number>;
  displayMode: 'simple' | 'list';
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
  alertOnDelete?: ExprValToActualOrExpr<ExprVal.Boolean>;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: ffbc978ea11a92642c4df4836bf3489b2c75f402b3b68540c18de963c99199b7

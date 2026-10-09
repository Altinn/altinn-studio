import {
  ComponentBase,
  FormComponentProps,
  HTMLAutoCompleteValues,
  LabeledComponentProps,
  SaveWhileTyping,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export type CompTextAreaSerialized = {
  type: 'TextArea';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  saveWhileTyping?: SaveWhileTyping;
  autocomplete?: HTMLAutoCompleteValues;
  maxLength?: number;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: c22f23cd3ecee5ae0f1d21fa7af430ee146169a848f9b66a80b3aa53bc190545

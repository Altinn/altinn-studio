import {
  ComponentBase,
  FormComponentPropsWithRequired,
  ISelectionComponentFull,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export type CompDropdownSerialized = {
  type: 'Dropdown';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
} & ComponentBase &
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  ISelectionComponentFull &
  LabeledComponentProps;

// Source hash: 5cdf388d9ee0ce841e836b8d65f043ac7ca6776d56785ddc3ef001d096f6e4cc

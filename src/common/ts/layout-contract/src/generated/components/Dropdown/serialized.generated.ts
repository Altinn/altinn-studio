import {
  ComponentBase,
  FormComponentProps,
  ISelectionComponentFull,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
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
  FormComponentProps &
  SummarizableComponentProps &
  ISelectionComponentFull &
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: 58bf195a1a18650cddf360135f21d51161bfa7367faa4e8595b9b2a6e045faca

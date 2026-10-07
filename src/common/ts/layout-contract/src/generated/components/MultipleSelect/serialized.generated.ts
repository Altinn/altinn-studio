import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  ISelectionComponentFull,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export interface IDataModelBindingsForGroupMultiselect extends IDataModelBindingsOptionsSimple {
  group?: IRawDataModelBinding;
  checked?: IRawDataModelBinding;
}

export type CompMultipleSelectSerialized = {
  type: 'MultipleSelect';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForGroupMultiselect;
  deletionStrategy?: 'soft' | 'hard';
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  ISelectionComponentFull &
  LabeledComponentProps;

// Source hash: 7913dfae5b0f12d8aefde001fbac62fbec5ff66081d4f27488df57ba3a07dbca

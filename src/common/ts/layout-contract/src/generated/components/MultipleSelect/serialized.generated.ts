import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
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
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: 128e325878a4ff477e8821d29739f3923404568626d4d35ed60c91a41bf0bc44

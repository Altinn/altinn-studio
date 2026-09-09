import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  ISelectionComponentFull &
  LabeledComponentProps;

// Source hash: f956abb3b1f4e5c03992f91275eca3a29f344b02f1011da54f36b8a405bbb062

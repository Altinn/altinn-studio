import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  ISelectionComponentFull,
  LabeledComponentProps,
  LayoutStyle,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export interface IDataModelBindingsForGroupCheckbox extends IDataModelBindingsOptionsSimple {
  group?: IRawDataModelBinding;
  checked?: IRawDataModelBinding;
}

export type CompCheckboxesSerialized = {
  type: 'Checkboxes';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForGroupCheckbox;
  deletionStrategy?: 'soft' | 'hard';
  layout?: LayoutStyle;
  showLabelsInTable?: boolean;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  ISelectionComponentFull &
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: 5b5d0a973bcc7e693f66e67114748646298a3c3d411cc244e7d29e8f7bde910b

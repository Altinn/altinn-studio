import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  SaveWhileTyping,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForAddress {
  address: IRawDataModelBinding;
  zipCode: IRawDataModelBinding;
  postPlace: IRawDataModelBinding;
  careOf?: IRawDataModelBinding;
  houseNumber?: IRawDataModelBinding;
}

export type CompAddressSerialized = {
  type: 'Address';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    careOfTitle?: ExprValToActualOrExpr<ExprVal.String>;
    zipCodeTitle?: ExprValToActualOrExpr<ExprVal.String>;
    postPlaceTitle?: ExprValToActualOrExpr<ExprVal.String>;
    houseNumberTitle?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForAddress;
  saveWhileTyping?: SaveWhileTyping;
  simplified?: boolean;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: e06c20ff0957bf435abd9c5385a1cb01116983dcda83ff9aacaf6e08955a9130

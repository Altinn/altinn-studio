import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 19f2828c0cf4bbe5d408670cdd1e8ffc31791f115639660703e4596408351b69

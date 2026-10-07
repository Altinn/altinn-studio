import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompOrganizationLookupSerialized = {
  type: 'OrganizationLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: { orgnr: IRawDataModelBinding; name?: IRawDataModelBinding };
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: 7e70c8ead2d89f63588408903b64b7a6e0c44cb3437ae3b3aba1f3ded1053c13

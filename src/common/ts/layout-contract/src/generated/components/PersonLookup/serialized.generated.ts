import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForPersonLookup {
  ssn: IRawDataModelBinding;
  fullName?: IRawDataModelBinding;
  lastName?: IRawDataModelBinding;
  middleName?: IRawDataModelBinding;
  firstName?: IRawDataModelBinding;
}

export type CompPersonLookupSerialized = {
  type: 'PersonLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForPersonLookup;
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: 526deb6727db8de232421b3fa748f296efafc1b452f69db8b69bfbab2caa7257

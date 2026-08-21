import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ISelectionComponent,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import {
  IDataModelBindingsList,
  IDataModelBindingsSimple,
} from '@app/layout-contract/generated/serialized-common.generated';

export type CompFileUploadWithTagSerialized = {
  type: 'FileUploadWithTag';
  textResourceBindings?: { tagTitle?: ExprValToActualOrExpr<ExprVal.String> } & TRBFormComp &
    TRBSummarizable &
    TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple | IDataModelBindingsList;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: ExprValToActualOrExpr<ExprVal.Number>;
  minNumberOfAttachments: ExprValToActualOrExpr<ExprVal.Number>;
  displayMode: 'simple' | 'list';
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
  alertOnDelete?: ExprValToActualOrExpr<ExprVal.Boolean>;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps &
  ISelectionComponent;

// Source hash: ec744c054e631a995fd5fb01ac8125fabafe66af2f42318629c8711544183164

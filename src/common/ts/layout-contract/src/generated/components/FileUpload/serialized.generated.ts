import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ISelectionComponent,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import {
  IDataModelBindingsList,
  IDataModelBindingsSimple,
} from '@app/layout-contract/generated/serialized-common.generated';

export type CompFileUploadSerialized = {
  type: 'FileUpload';
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
  ReadOnlyComponentProps &
  LabeledComponentProps &
  ISelectionComponent;

// Source hash: db02c3b3d4fadc7f61bd44b91ce8dafddead53fcefa335f620e9ad8e3fc6c37e

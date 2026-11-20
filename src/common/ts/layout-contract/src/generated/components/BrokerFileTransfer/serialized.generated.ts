import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompBrokerFileTransferSerialized = {
  type: 'BrokerFileTransfer';
  textResourceBindings?: {
    checksumTitle?: ExprValToActualOrExpr<ExprVal.String>;
    checksumHelp?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable &
    TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: {
    fileTransferId: IRawDataModelBinding;
    fileTransferStatus: IRawDataModelBinding;
    fileName?: IRawDataModelBinding;
  };
  resourceId: string;
  hasCustomRecipients?: boolean;
  recipients?: ExprValToActualOrExpr<ExprVal.String>;
  metadata?: { [key: string]: ExprValToActualOrExpr<ExprVal.String> };
  checksumField?: 'optional' | 'required';
  disableVirusScan?: boolean;
  maxFileTransferSizeInMB?: number;
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: 7c3f6d90801ae2c8d672a21d12cdd90e654921fa4a408b05efe5f0fb6a8506ae

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
  checksum?: 'optional' | 'required';
  disableVirusScan?: boolean;
  maxFileTransferSizeInMB?: number;
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: 6c1eb08fb220cd45caea88c98e9c5fd02d1cc458bdb1147af326da615481037a

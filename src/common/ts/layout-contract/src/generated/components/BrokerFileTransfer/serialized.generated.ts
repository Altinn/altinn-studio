import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type CompBrokerFileTransferSerialized = {
  type: 'BrokerFileTransfer';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: {
    fileTransferId: IRawDataModelBinding;
    fileTransferStatus: IRawDataModelBinding;
    fileName?: IRawDataModelBinding;
    checksum?: IRawDataModelBinding;
  };
  resourceId: string;
  hasCustomRecipients?: boolean;
  recipients?: ExprValToActualOrExpr<ExprVal.String>;
  metadata?: { [key: string]: ExprValToActualOrExpr<ExprVal.String> };
  disableVirusScan?: boolean;
  maxFileTransferSizeInMB?: number;
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: cd2cc4f940296191d3a2a73c62fa8cc0f4f4ca03b6535250eb519df0e0f15169

import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface BrokerFileTransferSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type BrokerFileTransferSummaryOverridesWithRef =
  | ({ componentId: string } & BrokerFileTransferSummaryOverrides)
  | ({ componentType: 'BrokerFileTransfer' } & BrokerFileTransferSummaryOverrides);

export interface CompBrokerFileTransferExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'BrokerFileTransfer';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: {
    fileTransferId: IDataModelReference;
    fileTransferStatus: IDataModelReference;
    fileName?: IDataModelReference;
    checksum?: IDataModelReference;
  };
  resourceId: string;
  hasCustomRecipients?: boolean;
  recipients?: ExprValToActualOrExpr<ExprVal.String>;
  metadata?: { [key: string]: ExprValToActualOrExpr<ExprVal.String> };
  disableVirusScan?: boolean;
  maxFileTransferSizeInMB?: number;
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
}

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompBrokerFileTransferExternal;
  summaryOverrides: BrokerFileTransferSummaryOverrides;
  summaryOverridesWithRef: BrokerFileTransferSummaryOverridesWithRef;
};

// Source hash: 48feed5480c5561ab021bf05ee37964753eee02508db0634a0db3e6823ea7dab

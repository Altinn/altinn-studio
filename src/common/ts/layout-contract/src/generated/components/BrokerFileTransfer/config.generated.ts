import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
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

export interface BrokerFileTransferSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type BrokerFileTransferSummaryOverridesWithRef =
  | ({ componentId: string } & BrokerFileTransferSummaryOverrides)
  | ({ componentType: 'BrokerFileTransfer' } & BrokerFileTransferSummaryOverrides);

export interface CompBrokerFileTransferExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
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
    fileTransferId: IDataModelReference;
    fileTransferStatus: IDataModelReference;
    fileName?: IDataModelReference;
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

// Source hash: c192be682ee98c47ec9d3269b44ebb320a4184ed28d2fd5fd91030871f1bc6de

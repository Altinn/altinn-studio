import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface CompSigningActionsExternal extends ComponentBase {
  type: 'SigningActions';
  textResourceBindings?: {
    awaitingSignaturePanelTitle?: ExprValToActualOrExpr<ExprVal.String>;
    checkboxLabel?: ExprValToActualOrExpr<ExprVal.String>;
    checkboxDescription?: ExprValToActualOrExpr<ExprVal.String>;
    signingButton?: ExprValToActualOrExpr<ExprVal.String>;
    noActionRequiredPanelTitleHasSigned?: ExprValToActualOrExpr<ExprVal.String>;
    noActionRequiredPanelTitleNotSigned?: ExprValToActualOrExpr<ExprVal.String>;
    noActionRequiredPanelDescriptionHasSigned?: ExprValToActualOrExpr<ExprVal.String>;
    noActionRequiredPanelDescriptionNotSigned?: ExprValToActualOrExpr<ExprVal.String>;
    noActionRequiredButton?: ExprValToActualOrExpr<ExprVal.String>;
    awaitingOtherSignaturesPanelTitle?: ExprValToActualOrExpr<ExprVal.String>;
    awaitingOtherSignaturesPanelDescriptionNotSigning?: ExprValToActualOrExpr<ExprVal.String>;
    awaitingOtherSignaturesPanelDescriptionSigned?: ExprValToActualOrExpr<ExprVal.String>;
    submitPanelTitle?: ExprValToActualOrExpr<ExprVal.String>;
    submitPanelDescription?: ExprValToActualOrExpr<ExprVal.String>;
    submitButton?: ExprValToActualOrExpr<ExprVal.String>;
    errorPanelTitle?: ExprValToActualOrExpr<ExprVal.String>;
    errorPanelDescription?: ExprValToActualOrExpr<ExprVal.String>;
    rejectModalTitle?: ExprValToActualOrExpr<ExprVal.String>;
    rejectModalDescription?: ExprValToActualOrExpr<ExprVal.String>;
    rejectModalButton?: ExprValToActualOrExpr<ExprVal.String>;
    rejectModalCloseButton?: ExprValToActualOrExpr<ExprVal.String>;
    rejectModalTriggerButton?: ExprValToActualOrExpr<ExprVal.String>;
  };
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Action,
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
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompSigningActionsExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 606745ed5844d6d898b120d7423e9095ee1a366f72abf5f2c6354e14e3a2e720

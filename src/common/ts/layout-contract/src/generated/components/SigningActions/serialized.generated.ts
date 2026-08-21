import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompSigningActionsSerialized = {
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
} & ComponentBase;

// Source hash: 67b0b9b47c3d603df22bd137b62db5e5295ac4df331c9599050e002f489363ff

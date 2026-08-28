import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type ActionButtonStyle = 'primary' | 'secondary';

export type CompPDFPreviewButtonSerialized = {
  type: 'PDFPreviewButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  buttonStyle: ActionButtonStyle;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 5697b0dbab610e94d37d482447122662ff3f9f8862df0d24d18623efe0b4b791

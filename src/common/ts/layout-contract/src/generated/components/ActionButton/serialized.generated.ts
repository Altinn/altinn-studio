import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type ActionButtonStyle = 'primary' | 'secondary';

export type CompActionButtonSerialized = {
  type: 'ActionButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  action: 'instantiate' | 'confirm' | 'sign' | 'reject';
  buttonStyle: ActionButtonStyle;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 5836f28f32ae9a82489830ba746028aded3db40f7d17cebd977ac1677ee9d9c4

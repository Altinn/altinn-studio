import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type AlertSeverity = 'success' | 'warning' | 'danger' | 'info';

export type CompAlertSerialized = {
  type: 'Alert';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    body?: ExprValToActualOrExpr<ExprVal.String>;
  };
  severity: AlertSeverity;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 5c2662d4cc7ee208ce3c2c383a20365b5e321174400259f7288e9d3dd856d453

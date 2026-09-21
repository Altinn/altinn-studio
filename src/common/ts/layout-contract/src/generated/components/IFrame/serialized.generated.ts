import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface ISandboxProperties {
  allowPopups?: boolean;
  allowPopupsToEscapeSandbox?: boolean;
}

export type CompIFrameSerialized = {
  type: 'IFrame';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  sandbox?: ISandboxProperties;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: bbc6a7948124d44f3642c28c5bbbc0fa8b40d493a8a20a182bf577126876effa

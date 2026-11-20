import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompParagraphSerialized = {
  type: 'Paragraph';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: e86286b4e3148c3e5bc2e71da0aa3f934a23c852529c693d3ae86f46312f5d4a

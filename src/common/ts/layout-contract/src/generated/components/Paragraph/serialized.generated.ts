import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompParagraphSerialized = {
  type: 'Paragraph';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: a54b22ae9c16e215a005c7b5b7464d5116224dcd0406c7044776cf1395b46172

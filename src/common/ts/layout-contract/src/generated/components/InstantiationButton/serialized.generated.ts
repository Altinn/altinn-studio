import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IMapping } from '@app/layout-contract/generated/common.generated';

export type CompInstantiationButtonSerialized = {
  type: 'InstantiationButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  mapping?: IMapping;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 115324bd238dee7f586a8d8a749542c0f623a9dbfb081ebb678e51b83497e7e1

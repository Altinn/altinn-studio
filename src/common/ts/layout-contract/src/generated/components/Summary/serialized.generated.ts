import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface SummaryDisplayProperties {
  hideChangeButton?: boolean;
  hideValidationMessages?: boolean;
  useComponentGrid?: boolean;
  hideBottomBorder?: boolean;
  nextButton?: boolean;
}

export type CompSummarySerialized = {
  type: 'Summary';
  componentRef: string;
  largeGroup?: boolean;
  excludedChildren?: string[];
  textResourceBindings?: { returnToSummaryButtonTitle?: ExprValToActualOrExpr<ExprVal.String> };
  display?: SummaryDisplayProperties;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: e18d705005067cb5ab673f6f9ceff265b5ddd71acf58b6eedd3be0f075291bf4

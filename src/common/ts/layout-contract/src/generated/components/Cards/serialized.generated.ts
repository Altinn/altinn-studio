import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export interface CardConfig {
  media?: string;
  title?: string;
  description?: string;
  footer?: string;
  children?: string[];
}

export type CardsColor = 'neutral' | 'subtle';

export type CardsMediaPosition = 'top' | 'bottom';

export type CompCardsSerialized = {
  type: 'Cards';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable;
  mediaPosition?: CardsMediaPosition;
  minMediaHeight?: string;
  minWidth?: string;
  color: CardsColor;
  cards: CardConfig[];
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: cc3dcf5b02608eedddacea38f556518ea2162fc1510434ef577bbe760bcc62fd

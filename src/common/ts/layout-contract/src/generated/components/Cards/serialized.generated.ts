import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

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
  textResourceBindings?: TRBSummarizable;
  mediaPosition?: CardsMediaPosition;
  minMediaHeight?: string;
  minWidth?: string;
  color: CardsColor;
  cards: CardConfig[];
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: c20daf337c7cd5bcc3cddd131762e84d812fac91f39909812b1c98e33a00dd37

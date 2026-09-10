import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface TabConfig {
  id: string;
  title: string;
  icon?: string;
  children: string[];
}

export type CompTabsSerialized = {
  type: 'Tabs';
  textResourceBindings?: TRBSummarizable;
  size?: 'small' | 'medium' | 'large';
  defaultTab?: string;
  tabs: TabConfig[];
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 51ccb132565d00d7865967016b4ffe7d7073a6fdd745043ffb809024e0f36a3f

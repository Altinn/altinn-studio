import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export interface TabConfig {
  id: string;
  title: string;
  icon?: string;
  children: string[];
}

export type CompTabsSerialized = {
  type: 'Tabs';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable;
  size?: 'small' | 'medium' | 'large';
  defaultTab?: string;
  tabs: TabConfig[];
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 30de3fd701b0e4a509112b204dfac1e2ec83914d1cf2f9414a166137bc8d1fe6

import { AnySummaryOverride, ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface SummaryOverrideForPage {
  pageId: string;
  hidden?: boolean;
}

export interface SummaryTargetComponent {
  type?: 'component';
  id: string;
  taskId?: string;
}

export interface SummaryTargetLayoutSet {
  type: 'layoutSet';
  taskId?: string;
}

export interface SummaryTargetPage {
  type: 'page';
  id: string;
  taskId?: string;
}

export type CompSummary2Serialized = {
  type: 'Summary2';
  target?: SummaryTargetPage | SummaryTargetLayoutSet | SummaryTargetComponent;
  showPageInAccordion?: boolean;
  isCompact?: boolean;
  hideEmptyFields?: boolean;
  overrides?: (AnySummaryOverride | SummaryOverrideForPage)[];
  dataModelBindings?: undefined;
  textResourceBindings?: undefined;
} & ComponentBase;

// Source hash: 1ceeffd441d7717f57846b223b1e9208d83867e92df95742f67febc8e921f89d

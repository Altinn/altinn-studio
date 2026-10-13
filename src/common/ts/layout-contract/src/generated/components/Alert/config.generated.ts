import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export type AlertSeverity = 'success' | 'warning' | 'danger' | 'info';

export type AlertSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Alert' } & ISummaryOverridesCommon);

export interface CompAlertExternal extends ComponentBase {
  type: 'Alert';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    body?: ExprValToActualOrExpr<ExprVal.String>;
  };
  severity: AlertSeverity;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompAlertExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: AlertSummaryOverridesWithRef;
};

// Source hash: 6a376b2af6d070b755a4eb56452ff192288ebc129168645c118ec66cb5f573aa

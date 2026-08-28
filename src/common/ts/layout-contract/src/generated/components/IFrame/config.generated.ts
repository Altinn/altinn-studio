import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface CompIFrameExternal extends ComponentBase {
  type: 'IFrame';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  sandbox?: ISandboxProperties;
  dataModelBindings?: undefined;
}

export interface ISandboxProperties {
  allowPopups?: boolean;
  allowPopupsToEscapeSandbox?: boolean;
}

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompIFrameExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 29322177d4284c3ff82a9f3f61e194c224e550b702fa4f3a96bfc79cbbfb2136

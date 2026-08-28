import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface CompAttachmentListExternal extends ComponentBase {
  type: 'AttachmentList';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  dataTypeIds?: string[];
  links?: boolean;
  groupByDataTypeGrouping?: boolean;
  showDataTypeDescriptions?: boolean;
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
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompAttachmentListExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 84267891a1163db87a41b285e2f7d32b3bec0112e1333e15b95b108833a4e610

import { ComponentBase, PageValidation } from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompNavigationBarExternal extends ComponentBase {
  type: 'NavigationBar';
  compact?: boolean;
  validateOnForward?: PageValidation;
  validateOnBackward?: PageValidation;
  dataModelBindings?: undefined;
  textResourceBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Action,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
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
  layout: CompNavigationBarExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 68388081f51c742566d2031f30ee5b2cc512cf7b174e61e66c1165ddff6e997a

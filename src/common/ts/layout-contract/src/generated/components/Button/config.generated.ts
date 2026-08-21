import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  IButtonProps,
  IMapping,
} from '@app/layout-contract/generated/common.generated';

export type ButtonMode = 'submit' | 'save' | 'instantiate';

export interface CompButtonExternal extends ComponentBase, IButtonProps {
  type: 'Button';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  mode?: ButtonMode;
  mapping?: IMapping;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Action,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
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
  layout: CompButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: c9341840f1e67830b3bb6c69da41600c7e16604bcb852459df3f9769a13c60ef

import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IButtonProps } from '@app/layout-contract/generated/common.generated';

export interface CompLinkExternal extends ComponentBase, IButtonProps {
  type: 'Link';
  textResourceBindings?: {
    target?: ExprValToActualOrExpr<ExprVal.String>;
    title?: ExprValToActualOrExpr<ExprVal.String>;
    download?: ExprValToActualOrExpr<ExprVal.String>;
  };
  style: LinkStyle;
  openInNewTab?: boolean;
  dataModelBindings?: undefined;
}

export type LinkStyle = 'primary' | 'secondary' | 'link';

export const componentConfig = {
  category: CompCategory.Action,
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
  layout: CompLinkExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: de7019dd164b881f75cebf1a20066198875076c27793867c98cdc3d1cc5048e7

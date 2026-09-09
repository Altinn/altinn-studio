import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
  IDataModelBindingsOptionsSimple,
  ILikertColumnProperties,
  ISelectionComponentFull,
  LayoutStyle,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompLikertItemExternal
  extends
    ComponentBase,
    FormComponentPropsWithRequired,
    SummarizableComponentProps,
    ISelectionComponentFull,
    ILikertColumnProperties {
  type: 'LikertItem';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
  showLabelsInTable?: boolean;
  layout?: LayoutStyle;
}

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'internal',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: false,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: true,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompLikertItemExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 0612635a36ad0ec22ead230c98089ab7cffd38f165a7b7ac40a014af59368049

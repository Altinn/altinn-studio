import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  ILikertColumnProperties,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  LayoutStyle,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompLikertItemExternal
  extends
    ComponentBase,
    FormComponentProps,
    ISelectionComponentFull,
    ILikertColumnProperties,
    LabeledComponentProps {
  type: 'LikertItem';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
  showLabelsInTable?: boolean;
  layout?: LayoutStyle;
}

export interface LikertItemSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type LikertItemSummaryOverridesWithRef =
  | ({ componentId: string } & LikertItemSummaryOverrides)
  | ({ componentType: 'LikertItem' } & LikertItemSummaryOverrides);

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
  summaryOverrides: LikertItemSummaryOverrides;
  summaryOverridesWithRef: LikertItemSummaryOverridesWithRef;
};

// Source hash: 5c9e249081c4dfc979606ec1b6ff2d1e37a9c60f8ed6003ff04a0105d8ddf556

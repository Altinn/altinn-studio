import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsLikert,
  ILikertColumnProperties,
  ISelectionComponent,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompLikertExternal
  extends
    ComponentBase,
    ISelectionComponent,
    FormComponentProps,
    LabeledComponentProps,
    ILikertColumnProperties {
  type: 'Likert';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    leftColumnHeader?: ExprValToActualOrExpr<ExprVal.String>;
    questions?: ExprValToActualOrExpr<ExprVal.String>;
    questionDescriptions?: ExprValToActualOrExpr<ExprVal.String>;
    questionHelpTexts?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsLikert;
  filter?: ILikertFilter;
}

export type ILikertFilter = { key: 'start' | 'stop'; value: string | number }[];

export interface LikertSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type LikertSummaryOverridesWithRef =
  | ({ componentId: string } & LikertSummaryOverrides)
  | ({ componentType: 'Likert' } & LikertSummaryOverrides);

export const componentConfig = {
  category: CompCategory.Container,
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
    canHaveOptions: true,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompLikertExternal;
  summaryOverrides: LikertSummaryOverrides;
  summaryOverridesWithRef: LikertSummaryOverridesWithRef;
};

// Source hash: 5566c8f5188131429b531c4b6ab767ecc240bef0fd311311dd0684b9b1422ea5

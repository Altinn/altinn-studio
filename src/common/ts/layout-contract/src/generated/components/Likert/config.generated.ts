import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsLikert,
  ILikertColumnProperties,
  ISelectionComponent,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompLikertExternal
  extends
    ComponentBase,
    SummarizableComponentProps,
    ISelectionComponent,
    FormComponentProps,
    LabeledComponentProps,
    ILikertColumnProperties {
  type: 'Likert';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    leftColumnHeader?: ExprValToActualOrExpr<ExprVal.String>;
    questions?: ExprValToActualOrExpr<ExprVal.String>;
    questionDescriptions?: ExprValToActualOrExpr<ExprVal.String>;
    questionHelpTexts?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsLikert;
  filter?: ILikertFilter;
}

export type ILikertFilter = { key: 'start' | 'stop'; value: string | number }[];

export type LikertSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Likert' } & ISummaryOverridesCommon);

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
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: LikertSummaryOverridesWithRef;
};

// Source hash: 668578f964b13d41565f2d14c88597527531375c74c01291295ac62cb32fb40d

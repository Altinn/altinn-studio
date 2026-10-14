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

// Source hash: b6a9af4ddec8143c69ca4387ab35d715ba4159464eec98d2da86e3353f2550c9

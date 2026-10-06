import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompCustomExternal
  extends ComponentBase, FormComponentProps, SummarizableComponentProps, LabeledComponentProps {
  type: 'Custom';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    [key: string]: ExprValToActualOrExpr<ExprVal.String> | undefined;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForCustom;
  tagName: string;
  [key: string]: unknown;
}

export interface IDataModelBindingsForCustom {
  [key: string]: IDataModelReference;
}

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: true,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompCustomExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: f330239af87004d1a3eb850a0fb6ec8856c5f4ff4f22e74c15e702c6c0691d60

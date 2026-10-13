import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompCustomExternal
  extends ComponentBase, FormComponentProps, SummarizableComponentProps {
  type: 'Custom';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    [key: string]: ExprValToActualOrExpr<ExprVal.String> | undefined;
  } & TRBFormComp &
    TRBSummarizable;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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

// Source hash: 332e268a6902f197bb2f781883bb0d6d8194c86dd702fe751154b9166b25f3ba

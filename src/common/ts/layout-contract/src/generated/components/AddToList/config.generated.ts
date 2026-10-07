import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompAddToListExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    RequiredComponentProps,
    ReadOnlyComponentProps {
  type: 'AddToList';
  textResourceBindings?: TRBFormComp & TRBSummarizable;
  title: string;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: { data: IDataModelReference };
}

export const componentConfig = {
  category: CompCategory.Form,
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
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompAddToListExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: c66405a4e0d2c4bb08191ede88b00e998067b7d1b95e0b49c2c8c5656dc1fe6b

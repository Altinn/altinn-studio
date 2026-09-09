import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompSubformExternal
  extends ComponentBase, FormComponentPropsWithRequired, SummarizableComponentProps {
  type: 'Subform';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    addButton?: ExprValToActualOrExpr<ExprVal.String>;
    tableEditButton?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  layoutSet: string;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  entryDisplayName?: ExprValToActualOrExpr<ExprVal.String>;
  tableColumns: { headerContent: string; cellContent: ISubformCellContent }[];
  summaryDelimiter?: string;
  dataModelBindings?: undefined;
}

export type ISubformCellContent =
  | { value: ExprValToActualOrExpr<ExprVal.String>; default?: string }
  | { query: string; default?: string };

export interface SubformSummaryOverrides extends ISummaryOverridesCommon {
  display?: 'table' | 'full';
}

export type SubformSummaryOverridesWithRef =
  | ({ componentId: string } & SubformSummaryOverrides)
  | ({ componentType: 'Subform' } & SubformSummaryOverrides);

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
    renderInTabs: false,
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
  layout: CompSubformExternal;
  summaryOverrides: SubformSummaryOverrides;
  summaryOverridesWithRef: SubformSummaryOverridesWithRef;
};

// Source hash: f351733d51733c7e29fea67e526641ce372b10bf8850f407963493ea9500aa80

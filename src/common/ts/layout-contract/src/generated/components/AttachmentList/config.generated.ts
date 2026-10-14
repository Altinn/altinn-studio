import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export type AttachmentListSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'AttachmentList' } & ISummaryOverridesCommon);

export interface CompAttachmentListExternal extends ComponentBase {
  type: 'AttachmentList';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  dataTypeIds?: string[];
  links?: boolean;
  groupByDataTypeGrouping?: boolean;
  showDataTypeDescriptions?: boolean;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Presentation,
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
  layout: CompAttachmentListExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: AttachmentListSummaryOverridesWithRef;
};

// Source hash: 6ad62af2120e1167611ed995a3a2d3b85fa16a4fe7f5052de5a0c03fdcf2cf0e

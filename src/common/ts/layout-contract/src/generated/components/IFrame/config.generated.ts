import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export interface CompIFrameExternal extends ComponentBase {
  type: 'IFrame';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  sandbox?: ISandboxProperties;
  dataModelBindings?: undefined;
}

export type IFrameSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'IFrame' } & ISummaryOverridesCommon);

export interface ISandboxProperties {
  allowPopups?: boolean;
  allowPopupsToEscapeSandbox?: boolean;
}

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
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
  layout: CompIFrameExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: IFrameSummaryOverridesWithRef;
};

// Source hash: f1b624d84645693cb2bbae5117e4d8b0594b3d2d166724eae6252b0b5adfb0d7

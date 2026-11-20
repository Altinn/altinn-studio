import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export interface CompVideoExternal extends ComponentBase {
  type: 'Video';
  textResourceBindings?: { altText?: ExprValToActualOrExpr<ExprVal.String> };
  video?: IVideo;
  dataModelBindings?: undefined;
}

export interface IVideo {
  src: VideoSrc;
}

export interface VideoSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export type VideoSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Video' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
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
  layout: CompVideoExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: VideoSummaryOverridesWithRef;
};

// Source hash: 02cf0ae4b80c24501a78f732085ce3eb9307cca77874a2193f145cdc9d77eef8

import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export interface AudioSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export type AudioSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Audio' } & ISummaryOverridesCommon);

export interface CompAudioExternal extends ComponentBase {
  type: 'Audio';
  textResourceBindings?: { altText?: ExprValToActualOrExpr<ExprVal.String> };
  audio?: IAudio;
  dataModelBindings?: undefined;
}

export interface IAudio {
  src: AudioSrc;
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
  layout: CompAudioExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: AudioSummaryOverridesWithRef;
};

// Source hash: 92dbc2622b19fa100e3c234475aa33ac27f100814d45f8a6bb92fbebc552a6b2

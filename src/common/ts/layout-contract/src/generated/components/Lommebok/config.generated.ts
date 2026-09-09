import {
  ComponentBase,
  FormComponentProps,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompLommebokExternal
  extends ComponentBase, FormComponentProps, SummarizableComponentProps, LabeledComponentProps {
  type: 'Lommebok';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  dataModelBindings?: undefined;
}

export type LommebokSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Lommebok' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Form,
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
  layout: CompLommebokExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: LommebokSummaryOverridesWithRef;
};

// Source hash: 895dbe7c74a8763cf21c62a1cd7a7533ab09286e06bee4490904a7a05ec68980

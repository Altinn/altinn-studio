import {
  ComponentBase,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompButtonGroupExternal
  extends ComponentBase, SummarizableComponentProps, LabeledComponentProps {
  type: 'ButtonGroup';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  children: string[];
  dataModelBindings?: undefined;
}

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
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompButtonGroupExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: aedeaf13f7fe35bf89b70e129484b2c04e9e9a48949231ea03ce0d900a1320a0

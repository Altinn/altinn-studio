import {
  ComponentBase,
  LabeledComponentProps,
  TRBLabel,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompButtonGroupExternal extends ComponentBase, LabeledComponentProps {
  type: 'ButtonGroup';
  children: string[];
  textResourceBindings?: TRBLabel;
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
    isSummarizable: false,
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

// Source hash: cb1c28f608966f0d78330a505bb8f80705b39a8a228987375643351a68d5bea3

import {
  ComponentBase,
  LabeledComponentProps,
  TRBLabel,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompInstanceInformationExternal extends ComponentBase, LabeledComponentProps {
  type: 'InstanceInformation';
  elements?: {
    dateSent?: boolean;
    sender?: boolean;
    receiver?: boolean;
    referenceNumber?: boolean;
  };
  textResourceBindings?: TRBLabel;
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
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompInstanceInformationExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 1ab982c647effe6e77031a37d6097a86b01373b242bcdbcaa08a148464275fdd

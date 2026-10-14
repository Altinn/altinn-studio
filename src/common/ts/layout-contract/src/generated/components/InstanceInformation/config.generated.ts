import {
  ComponentBase,
  ISummaryOverridesCommon,
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

export type InstanceInformationSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'InstanceInformation' } & ISummaryOverridesCommon);

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
  layout: CompInstanceInformationExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: InstanceInformationSummaryOverridesWithRef;
};

// Source hash: 3d2c36f728837730316ed378afeb8eac58592e0c01731b5b48112e9008716a59

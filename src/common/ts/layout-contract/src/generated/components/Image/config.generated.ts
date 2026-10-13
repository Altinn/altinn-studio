import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export interface CompImageExternal extends ComponentBase {
  type: 'Image';
  textResourceBindings?: {
    altTextImg?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  image?: IImage;
  dataModelBindings?: undefined;
}

export type GridJustification =
  'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';

export interface IImage {
  src: IImageSrc;
  width: string;
  align: GridJustification;
}

export interface IImageSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export type ImageSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Image' } & ISummaryOverridesCommon);

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
  layout: CompImageExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: ImageSummaryOverridesWithRef;
};

// Source hash: fe5ff9a93fd9d6a75d9725bdb8fb61cf9ed5256332e92fdcfda52e1d5c2b4be1

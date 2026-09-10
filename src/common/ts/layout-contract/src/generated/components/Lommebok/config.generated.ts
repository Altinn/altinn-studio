import {
  ComponentBase,
  FormComponentProps,
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
  request?: RequestedDocument[];
  issue?: IssuableDocument[];
  dataModelBindings?: undefined;
}

export type IssuableDocument =
  | {
      type: 'minid-pid';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'norsk-identitetsnummer';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'advokatbevilling';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'norsk-id-bevis';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'digital-kontaktinformasjon';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'norsk-foererkort';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'handicapbevis';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'aldersbevis';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'legeerklaeringbevis';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'inntektsbevis';
      urlDataType?: string;
      urlField: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    };

export type RequestedDocument =
  | {
      type: 'minid-pid';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'norsk-identitetsnummer';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'advokatbevilling';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'norsk-id-bevis';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'digital-kontaktinformasjon';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'norsk-foererkort';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'handicapbevis';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'aldersbevis';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'legeerklaeringbevis';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    }
  | {
      type: 'inntektsbevis';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    };

export const componentConfig = {
  category: CompCategory.Form,
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
  layout: CompLommebokExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 4ced97030e2ba6ef5cb1d1c26119ddc9d40d688c2eaabf75ac173ff80db42094

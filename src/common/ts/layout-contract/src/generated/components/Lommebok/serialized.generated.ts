import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

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
    }
  | {
      type: 'legeerklaering-tt-kort';
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
    }
  | {
      type: 'legeerklaering-tt-kort';
      saveToDataType?: string;
      alternativeUploadToDataType?: string;
      data?: {
        field: string;
        title: string;
        displayType?: 'string' | 'date' | 'image' | 'boolean';
      }[];
    };

export type CompLommebokSerialized = {
  type: 'Lommebok';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  request?: RequestedDocument[];
  issue?: IssuableDocument[];
  dataModelBindings?: undefined;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: f4c6c87b076bd9d26df6d9cdd062f3b15657b94b4fbfd10aed42c50ad4601787

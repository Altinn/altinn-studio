import {
  ComponentBase,
  LabeledComponentProps,
  TRBLabel,
} from '@app/layout-contract/generated/common.generated';

export type CompInstanceInformationSerialized = {
  type: 'InstanceInformation';
  elements?: {
    dateSent?: boolean;
    sender?: boolean;
    receiver?: boolean;
    referenceNumber?: boolean;
  };
  textResourceBindings?: TRBLabel;
  dataModelBindings?: undefined;
} & ComponentBase &
  LabeledComponentProps;

// Source hash: 9a650a04f820b130c2d3a999a94867771bd184cf4d1d5c9a36608828cd4c82ff

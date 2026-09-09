import {
  ComponentBase,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompButtonGroupSerialized = {
  type: 'ButtonGroup';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  children: string[];
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: b7508ba005b60c65d5cc00475359633d17af8fecc8a0ead52d128b9a06595f9c

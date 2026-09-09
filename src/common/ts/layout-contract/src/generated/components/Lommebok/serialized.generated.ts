import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompLommebokSerialized = {
  type: 'Lommebok';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  dataModelBindings?: undefined;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 4f33df2c5d13d86276628558d2a2530147fb5d095a1c43ad4bafd99076dcfa1a

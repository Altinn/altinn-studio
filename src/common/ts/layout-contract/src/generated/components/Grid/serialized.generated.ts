import {
  ComponentBase,
  GridRows,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompGridSerialized = {
  type: 'Grid';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  rows: GridRows;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 9a3c11007e87db06594a6963bd92e39f0ae9add8ce761f111637be5821b6039c

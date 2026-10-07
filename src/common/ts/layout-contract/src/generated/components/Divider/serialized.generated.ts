import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompDividerSerialized = {
  type: 'Divider';
  textResourceBindings?: TRBSummarizable;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: a09a9ac4bf40639fdc78f695eb8bd2da201d0bb5b3bf0feea111ab1f6a446788

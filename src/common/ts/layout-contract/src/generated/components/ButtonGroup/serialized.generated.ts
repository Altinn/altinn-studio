import {
  ComponentBase,
  LabeledComponentProps,
  TRBLabel,
} from '@app/layout-contract/generated/common.generated';

export type CompButtonGroupSerialized = {
  type: 'ButtonGroup';
  children: string[];
  textResourceBindings?: TRBLabel;
  dataModelBindings?: undefined;
} & ComponentBase &
  LabeledComponentProps;

// Source hash: c06286679c3f4d09844bb962e08b27c2fe9515903d308dd82765638b8e95d908

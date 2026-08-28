import { ComponentBase, PageValidation } from '@app/layout-contract/generated/common.generated';

export type CompNavigationBarSerialized = {
  type: 'NavigationBar';
  compact?: boolean;
  validateOnForward?: PageValidation;
  validateOnBackward?: PageValidation;
  dataModelBindings?: undefined;
  textResourceBindings?: undefined;
} & ComponentBase;

// Source hash: a309912981414275ff9ec855953d1b7944d7efd9154a175a8ce55639927fec4b

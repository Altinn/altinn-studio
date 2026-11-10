import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  TRBFormComp,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type CompAddToListSerialized = {
  type: 'AddToList';
  textResourceBindings?: TRBFormComp;
  title: string;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: { data: IRawDataModelBinding };
} & ComponentBase &
  FormComponentProps;

// Source hash: 05db9acdac5c440c07c710a00be9228993884b93058c48d688dc0d9c1a1c9fd1

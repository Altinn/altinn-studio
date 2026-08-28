import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompAttachmentListSerialized = {
  type: 'AttachmentList';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  dataTypeIds?: string[];
  links?: boolean;
  groupByDataTypeGrouping?: boolean;
  showDataTypeDescriptions?: boolean;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: c3b251bc46ca19a0ec69138e1e9a572cf92dafb1f8ed6d2ef6dbfd9a1c97b796

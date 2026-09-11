import type { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export const getTextResourceId = (
  binding: ExprValToActualOrExpr<ExprVal.String> | undefined,
): string | undefined => (typeof binding === 'string' ? binding : undefined);

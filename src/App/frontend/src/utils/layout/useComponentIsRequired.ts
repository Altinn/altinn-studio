import type { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

import { getComponentDef } from 'src/layout';
import type { CompExternal, CompTypes } from 'src/layout/layout';
import type { AnyComponent } from 'src/layout/LayoutComponent';

/** Resolves requiredness using the component's own rules at the current data model location. */
export function useComponentIsRequired(
  config: CompExternal,
  requiredOverride?: ExprValToActualOrExpr<ExprVal.Boolean>,
): boolean | undefined {
  const def: Pick<AnyComponent<CompTypes>, 'useIsRequired'> = getComponentDef(config.type);
  return def.useIsRequired(config, requiredOverride);
}

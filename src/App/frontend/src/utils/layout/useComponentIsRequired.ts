import type { FormComponentPropsWithRequired } from '@app/layout-contract/generated/common.generated';

import { getComponentDef } from 'src/layout';
import type { CompExternal } from 'src/layout/layout';

/** Resolves requiredness using the component's own rules at the current data model location. */
export function useComponentIsRequired(
  config: CompExternal,
  requiredOverride?: FormComponentPropsWithRequired['required'],
): boolean | undefined {
  const def = getComponentDef(config.type);
  return def.useIsRequired(config as never, requiredOverride);
}

import { CompCategory } from '@app/layout-contract';

import { getComponentDef } from 'src/layout';
import type { CompTypes } from 'src/layout/layout';

/**
 * Narrows an evaluated `required` value by component category. Form components always resolve to a boolean
 * (defaulting to false when unset, so the optional indicator can render), while non-form components resolve to
 * undefined so neither indicator renders for them.
 */
export function getRequired(type: CompTypes, required: boolean | undefined): boolean | undefined {
  if (getComponentDef(type)?.category !== CompCategory.Form) {
    return undefined;
  }

  return required ?? false;
}

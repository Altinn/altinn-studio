import { CompCategory } from '@app/layout-contract';

import { getComponentDef } from 'src/layout';
import type { CompTypes } from 'src/layout/layout';

/**
 * Reads the resolved `required` flag from a component. Defaults to false for form components, and undefined for non-form components.
 */
export function getRequired(item: { type: CompTypes; required?: boolean }): boolean | undefined {
  if ('required' in item && typeof item.required === 'boolean') {
    return item.required;
  }

  return getComponentDef(item.type)?.category === CompCategory.Form ? false : undefined;
}

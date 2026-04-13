import { produce } from 'immer';

import type { FormStoreState } from 'src/features/form/FormContext';

/**
 * Using the inferred types in the immer produce() function here introduces a lot of typescript overhead, which slows
 * down development. Using this instead short-circuits the type-checking to make it fast again.
 */
export function nodesProduce(fn: (draft: FormStoreState['nodes']) => void) {
  return produce((draft: FormStoreState) => {
    fn(draft.nodes);
  }) as unknown as (state: FormStoreState) => FormStoreState;
}

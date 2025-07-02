import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ISummaryOverridesCommon } from 'src/layout/common.generated';
import type { CompSummaryOverrides, CompTypes } from 'src/layout/layout';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type Summary2State = Pick<CompSummary2External, 'hideEmptyFields' | 'showPageInAccordion' | 'overrides' | 'isCompact'>;
const StoreContext = createContext<Summary2State | null>(null);

export function Summary2StoreProvider({ children, node }: PropsWithChildren<{ node: LayoutNode<'Summary2'> }>) {
  const { hideEmptyFields, showPageInAccordion, overrides, isCompact } = useItemWhenType(node.baseId, 'Summary2');

  return (
    <StoreContext.Provider value={{ hideEmptyFields, showPageInAccordion, overrides, isCompact }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useSummaryProp<K extends keyof Summary2State>(prop: K): Summary2State[K] | undefined {
  const state = useContext(StoreContext);
  if (!state) {
    // This may happen in, for example, subform summaries (where we don't always have the Summary2 component)
    return undefined;
  }

  return state[prop];
}

/**
 * Finds summary overrides for the given node. It will read component type level overrides first, then more specific
 * component-level overrides, and merge them into one object.
 */
export function useSummaryOverrides<Type extends CompTypes>(node: LayoutNode<Type> | undefined) {
  const overrides = useSummaryProp('overrides');
  if (!node || !overrides) {
    return undefined;
  }
  const specificOverrides = overrides.find((o) => 'componentId' in o && o.componentId === node.baseId);
  const typeOverrides = overrides.find((o) => 'componentType' in o && o.componentType === node.type);

  if (!typeOverrides && !specificOverrides) {
    return undefined;
  }

  const output = {} as CompSummaryOverrides<Type>;
  for (const override of [typeOverrides, specificOverrides]) {
    if (!override) {
      continue;
    }
    for (const key in override) {
      if (key !== 'componentId' && key !== 'componentType') {
        (output as ISummaryOverridesCommon)[key] = override[key];
      }
    }
  }
  return output;
}

/**
 * Finds summary overrides for a given page key
 */
export function useSummaryOverridesForPage(pageId: string) {
  const overrides = useSummaryProp('overrides');
  if (!overrides) {
    return undefined;
  }
  return overrides.find((o) => 'pageId' in o && o.pageId === pageId);
}

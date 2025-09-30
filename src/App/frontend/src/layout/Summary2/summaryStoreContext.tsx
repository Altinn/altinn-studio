import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ISummaryOverridesCommon } from 'src/layout/common.generated';
import type { CompSummaryOverrides, CompTypes } from 'src/layout/layout';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';

type Summary2State = Pick<
  CompSummary2External,
  'id' | 'hideEmptyFields' | 'showPageInAccordion' | 'overrides' | 'isCompact'
>;
const StoreContext = createContext<Summary2State | null>(null);

export function Summary2StoreProvider({ children, baseComponentId }: PropsWithChildren<{ baseComponentId: string }>) {
  const { id, hideEmptyFields, showPageInAccordion, overrides, isCompact } = useItemWhenType(
    baseComponentId,
    'Summary2',
  );

  return (
    <StoreContext.Provider value={{ id, hideEmptyFields, showPageInAccordion, overrides, isCompact }}>
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
export function useSummaryOverrides<Type extends CompTypes>(baseComponentId: string | undefined) {
  const overrides = useSummaryProp('overrides');
  const layoutLookups = useLayoutLookups();
  if (!baseComponentId || !overrides) {
    return undefined;
  }
  const component = layoutLookups.getComponent(baseComponentId);
  const specificOverrides = overrides.find((o) => 'componentId' in o && o.componentId === baseComponentId);
  const typeOverrides = overrides.find((o) => 'componentType' in o && o.componentType === component.type);

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

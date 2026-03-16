import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';

interface RepGroupEditContextValue {
  editableChildIds: Set<string>;
}

const { Provider, useCtx } = createContext<RepGroupEditContextValue | undefined>({
  name: 'RepGroupSummaryEditable',
  required: false,
  default: undefined,
});

export function RepGroupSummaryEditableProvider({
  editableChildIds,
  children,
}: PropsWithChildren<{ editableChildIds: string[] }>) {
  const value = useMemo(() => ({ editableChildIds: new Set(editableChildIds) }), [editableChildIds]);
  return <Provider value={value}>{children}</Provider>;
}

/**
 * Hook to check if a summary component is editable within a repeating group row context
 */
export function useIsEditableInRepGroup(baseId: string): boolean {
  const ctx = useCtx();
  if (!ctx) {
    return true;
  }
  return ctx.editableChildIds.has(baseId);
}

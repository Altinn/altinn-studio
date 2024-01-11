import React, { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { CompGroupRepeatingInternal } from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';

interface RepeatingGroupEditRowContext {
  multiPageEnabled: boolean;
  multiPageIndex: number;
  nextMultiPage: () => void;
  prevMultiPage: () => void;
  hasNextMultiPage: boolean;
  hasPrevMultiPage: boolean;
}

const { Provider, useCtx } = createContext<RepeatingGroupEditRowContext>({
  name: 'RepeatingGroupEditRow',
  required: true,
});

function useRepeatingGroupEditRowState(
  node: LayoutNodeForGroup<CompGroupRepeatingInternal>,
  editIndex: number,
): RepeatingGroupEditRowContext & { setMultiPageIndex: (index: number) => void } {
  const multiPageEnabled = node.item.edit?.multiPage ?? false;
  const lastPage = useMemo(() => {
    const row = node.item.rows[editIndex];
    let lastPage = 0;
    for (const childNode of row.items) {
      lastPage = Math.max(lastPage, childNode.item.multiPageIndex ?? 0);
    }
    return lastPage;
  }, [editIndex, node.item.rows]);

  const [multiPageIndex, setMultiPageIndex] = useState(0);

  const nextMultiPage = useCallback(() => {
    setMultiPageIndex((prev) => Math.min(prev + 1, lastPage));
  }, [lastPage]);

  const prevMultiPage = useCallback(() => {
    setMultiPageIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    multiPageEnabled,
    multiPageIndex,
    nextMultiPage,
    prevMultiPage,
    hasNextMultiPage: multiPageEnabled && multiPageIndex < lastPage,
    hasPrevMultiPage: multiPageEnabled && multiPageIndex > 0,
    setMultiPageIndex,
  };
}

interface Props {
  node: LayoutNodeForGroup<CompGroupRepeatingInternal>;
  editIndex: number;
}

export function RepeatingGroupEditRowProvider({ node, editIndex, children }: PropsWithChildren<Props>) {
  const { setMultiPageIndex, ...state } = useRepeatingGroupEditRowState(node, editIndex);

  useRegisterNodeNavigationHandler((targetNode) => {
    if (!state.multiPageEnabled) {
      // Nothing to do here. Other navigation handlers will make sure this row is opened for editing.
      return false;
    }
    const ourChildRecursively = node.flat(true).find((item) => item.item.id === targetNode.item.id);
    if (!ourChildRecursively) {
      return false;
    }
    const ourDirectChildren = node.children();
    const ourChildDirectly = ourDirectChildren.find((n) => n.item.id === targetNode.item.id);
    if (ourChildDirectly) {
      const targetMultiPageIndex = targetNode.item.multiPageIndex ?? 0;
      if (targetMultiPageIndex !== state.multiPageIndex) {
        setMultiPageIndex(targetMultiPageIndex);
      }
      return true;
    }

    // It's our child, but not directly. We need to figure out which of our children contains the target node,
    // and navigate there. Then it's a problem that can be forwarded there.
    const ourChildrenIds = new Set(ourDirectChildren.map((n) => n.item.id));
    const childWeAreLookingFor = targetNode.parents((n) => (n?.item.id ? ourChildrenIds.has(n.item.id) : false))[0];
    if (childWeAreLookingFor && !(childWeAreLookingFor instanceof LayoutPage)) {
      const targetMultiPageIndex = childWeAreLookingFor.item.multiPageIndex ?? 0;
      if (targetMultiPageIndex !== state.multiPageIndex) {
        setMultiPageIndex(targetMultiPageIndex);
      }
      return true;
    }

    return false;
  });

  return <Provider value={state}>{children}</Provider>;
}

export const useRepeatingGroupEdit = () => useCtx();

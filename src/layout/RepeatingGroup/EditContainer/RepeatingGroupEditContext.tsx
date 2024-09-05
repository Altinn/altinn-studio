import React, { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
  node: LayoutNode<'RepeatingGroup'>,
  editId: string,
): RepeatingGroupEditRowContext & { setMultiPageIndex: (index: number) => void } {
  const { edit, rows } = useNodeItem(node);
  const multiPageEnabled = edit?.multiPage ?? false;
  const lastPage = useMemo(() => {
    const row = rows.find((r) => r && r.uuid === editId);
    let lastPage = 0;
    for (const childNode of row?.items ?? []) {
      lastPage = Math.max(lastPage, childNode.multiPageIndex ?? 0);
    }
    return lastPage;
  }, [editId, rows]);

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
  editId: string;
}

export function RepeatingGroupEditRowProvider({ editId, children }: PropsWithChildren<Props>) {
  const { node } = useRepeatingGroup();
  const { setMultiPageIndex, ...state } = useRepeatingGroupEditRowState(node, editId);
  const traversal = useNodeTraversalSelector();

  useRegisterNodeNavigationHandler(async (targetNode) => {
    if (!state.multiPageEnabled) {
      // Nothing to do here. Other navigation handlers will make sure this row is opened for editing.
      return false;
    }
    const ourChildRecursively = traversal(
      (t) =>
        t
          .with(node)
          .flat()
          .find((n) => n === targetNode),
      [node, targetNode],
    );
    if (!ourChildRecursively) {
      return false;
    }
    const ourDirectChildren = traversal((t) => t.with(node).children(), [node]);
    const ourChildDirectly = ourDirectChildren.find((n) => n === targetNode);
    if (ourChildDirectly) {
      const targetMultiPageIndex = targetNode.multiPageIndex ?? 0;
      if (targetMultiPageIndex !== state.multiPageIndex) {
        setMultiPageIndex(targetMultiPageIndex);
      }
      return true;
    }

    // It's our child, but not directly. We need to figure out which of our children contains the target node,
    // and navigate there. Then it's a problem that can be forwarded there.
    const ourChildrenIds = new Set(ourDirectChildren.map((n) => n.id));
    const childWeAreLookingFor = traversal(
      (t) => t.with(targetNode).parents((i) => i.type === 'node' && ourChildrenIds.has(i.layout.id)),
      [targetNode],
    )[0];

    if (childWeAreLookingFor && !(childWeAreLookingFor instanceof LayoutPage)) {
      const targetMultiPageIndex = childWeAreLookingFor.multiPageIndex ?? 0;
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

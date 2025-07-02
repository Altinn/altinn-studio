import React, { useCallback, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useExternalItem } from 'src/utils/layout/hooks';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';

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
): RepeatingGroupEditRowContext & { setMultiPageIndex: (index: number) => void } {
  const lastPage = RepGroupHooks.useLastMultiPageIndex(node) ?? 0;
  const multiPageEnabled = useExternalItem(node.baseId, 'RepeatingGroup').edit?.multiPage ?? false;
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

export function RepeatingGroupEditRowProvider({ children }: PropsWithChildren) {
  const { node } = useRepeatingGroup();
  const { setMultiPageIndex, ...state } = useRepeatingGroupEditRowState(node);

  useRegisterNodeNavigationHandler(async (targetNode) => {
    if (!state.multiPageEnabled) {
      // Nothing to do here. Other navigation handlers will make sure this row is opened for editing.
      return false;
    }
    let isOurChildRecursively = false;
    let subject: LayoutNode | LayoutPage | undefined = targetNode;
    while (subject instanceof LayoutNode) {
      if (subject.parent === node) {
        isOurChildRecursively = true;
        break;
      }
      subject = subject.parent;
    }

    if (!isOurChildRecursively) {
      return false;
    }
    const isOurChildDirectly = targetNode.parent === node;
    if (isOurChildDirectly) {
      const targetMultiPageIndex = targetNode.multiPageIndex ?? 0;
      if (targetMultiPageIndex !== state.multiPageIndex) {
        setMultiPageIndex(targetMultiPageIndex);
      }
      return true;
    }

    // It's our child, but not directly. We need to figure out which of our children contains the target node,
    // and navigate there. Then it's a problem that can be forwarded there.
    if (subject && !(subject instanceof LayoutPage)) {
      const targetMultiPageIndex = subject.multiPageIndex ?? 0;
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

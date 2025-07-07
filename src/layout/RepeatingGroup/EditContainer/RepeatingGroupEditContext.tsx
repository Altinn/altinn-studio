import React, { useCallback, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useRepeatingGroupComponentId } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { isHidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';

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
  baseComponentId: string,
): RepeatingGroupEditRowContext & { setMultiPageIndex: (index: number) => void } {
  const edit = useExternalItem(baseComponentId, 'RepeatingGroup').edit;
  const multiPageEnabled = edit?.multiPage ?? false;
  const lookups = useLayoutLookups();

  const children = RepGroupHooks.useChildIdsWithMultiPage(baseComponentId);

  const hiddenState = NodesInternal.useMemoSelector((state) =>
    children.map(({ id, multiPageIndex }) => ({
      nodeId: id,
      page: multiPageIndex,
      hidden: isHidden(state, 'node', id, lookups),
    })),
  );

  const visiblePages = [...new Set(hiddenState.filter(({ hidden }) => !hidden).map(({ page }) => page ?? 0))];
  const firstVisiblePage = Math.min(...visiblePages);
  const lastVisiblePage = Math.max(...visiblePages);

  const [multiPageIndex, setMultiPageIndex] = useState(firstVisiblePage);

  const findNextVisiblePage = useCallback(
    (start: number, step: number): number | undefined => {
      for (let page = start; step > 0 ? page <= lastVisiblePage : page >= firstVisiblePage; page += step) {
        if (hiddenState.some((state) => state.page === page && !state.hidden)) {
          return page;
        }
      }
      return undefined;
    },
    [firstVisiblePage, hiddenState, lastVisiblePage],
  );

  const nextMultiPage = useCallback(() => {
    const nextPage = findNextVisiblePage(multiPageIndex + 1, 1);
    if (nextPage !== undefined) {
      setMultiPageIndex(nextPage);
    }
  }, [findNextVisiblePage, multiPageIndex]);

  const prevMultiPage = useCallback(() => {
    const prevPage = findNextVisiblePage(multiPageIndex - 1, -1);
    if (prevPage !== undefined) {
      setMultiPageIndex(prevPage);
    }
  }, [findNextVisiblePage, multiPageIndex]);

  return {
    multiPageEnabled,
    multiPageIndex,
    nextMultiPage,
    prevMultiPage,
    hasNextMultiPage: multiPageEnabled && multiPageIndex < lastVisiblePage,
    hasPrevMultiPage: multiPageEnabled && multiPageIndex > firstVisiblePage,
    setMultiPageIndex,
  };
}

export function RepeatingGroupEditRowProvider({ children }: PropsWithChildren) {
  const baseComponentId = useRepeatingGroupComponentId();
  const { setMultiPageIndex, ...state } = useRepeatingGroupEditRowState(baseComponentId);
  const node = useNode(useIndexedId(baseComponentId));

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

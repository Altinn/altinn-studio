import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { SearchParams } from 'src/hooks/navigation';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { useRepeatingGroupComponentId } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useExternalItem } from 'src/utils/layout/hooks';
import { getBaseComponentId } from 'src/utils/splitDashedKey';
import type { ParentRef } from 'src/features/form/layout/makeLayoutLookups';

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
  const childrenNotMemoized = RepGroupHooks.useChildIdsWithMultiPageAndHidden(baseComponentId);
  const children = useMemoDeepEqual(() => childrenNotMemoized, [childrenNotMemoized]);

  const visiblePages = [
    ...new Set(children.filter(({ hidden }) => !hidden).map(({ multiPageIndex }) => multiPageIndex ?? 0)),
  ];
  const firstVisiblePage = Math.min(...visiblePages);
  const lastVisiblePage = Math.max(...visiblePages);

  const [multiPageIndex, setMultiPageIndex] = useState(firstVisiblePage);

  const findNextVisiblePage = useCallback(
    (start: number, step: number): number | undefined => {
      for (let page = start; step > 0 ? page <= lastVisiblePage : page >= firstVisiblePage; page += step) {
        if (children.some((state) => state.multiPageIndex === page && !state.hidden)) {
          return page;
        }
      }
      return undefined;
    },
    [firstVisiblePage, children, lastVisiblePage],
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
  const layoutLookups = useLayoutLookups();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!state.multiPageEnabled) {
      // Nothing to do here. Other navigation handlers will make sure this row is opened for editing.
      return;
    }
    const targetIndexedId = searchParams.get(SearchParams.FocusComponentId);
    if (!targetIndexedId) {
      return;
    }

    const targetBaseComponentId = getBaseComponentId(targetIndexedId);

    let isOurChildDirectly = false;
    let isOurChildRecursively = false;
    let subject: ParentRef = { type: 'node', id: targetBaseComponentId };
    while (subject?.type === 'node') {
      const parent = layoutLookups.componentToParent[subject.id];
      if (parent?.type === 'node' && parent.id === baseComponentId) {
        isOurChildRecursively = true;
        isOurChildDirectly = subject.id === targetBaseComponentId;
        break;
      }
      subject = parent;
    }

    if (!isOurChildRecursively) {
      return;
    }

    const componentConfig = layoutLookups.getComponent(baseComponentId, 'RepeatingGroup');
    if (!componentConfig.edit?.multiPage) {
      return;
    }

    // It's our child, but not directly. We need to figure out which of our children contains the target,
    // and navigate there. Then it's a problem that can be forwarded there.
    const multiPageSubject = isOurChildDirectly ? targetBaseComponentId : subject.id;

    for (const id of componentConfig.children) {
      const [pageIndex, baseId] = id.split(':', 2);
      if (baseId === multiPageSubject) {
        setMultiPageIndex(parseInt(pageIndex, 10));
      }
    }
  }, [searchParams, baseComponentId, layoutLookups, state.multiPageEnabled, setMultiPageIndex]);

  return <Provider value={state}>{children}</Provider>;
}

export const useRepeatingGroupEdit = () => useCtx();

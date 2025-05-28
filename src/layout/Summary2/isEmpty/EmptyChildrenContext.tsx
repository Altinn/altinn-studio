import React, { createContext, useLayoutEffect, useReducer, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { SummaryContains } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';

type Action = { when: 'mount'; content: SummaryContains } | { when: 'unmount'; content: SummaryContains };

export interface EmptyChildrenContext {
  parent?: EmptyChildrenContext;
  onlyEmptyChildren: boolean;
  dispatch: React.Dispatch<Action>;
}

const Context = createContext<EmptyChildrenContext | undefined>(undefined);

/**
 * This boundary will keep track of summary components rendered within it, counting how many are empty and how many
 * are not empty. This is used to hide summaries for groups/containers where all children are empty. By storing this
 * in a context and counting them, the components themselves can self-report their emptiness-state. That way we don't
 * have to implement a method for a container-component to 'reach down into' their child components to find out if
 * they are empty or not.
 */
export function EmptyChildrenBoundary({ children, reportSelf = true }: PropsWithChildren<{ reportSelf?: boolean }>) {
  const parent = React.useContext(Context);
  const countsRef = useRef({ empty: 0, notEmpty: 0, presentational: 0 });

  const [onlyEmptyChildren, dispatch] = useReducer((_prevState: boolean, action: Action): boolean => {
    const amountToAdd = action.when === 'mount' ? 1 : -1;
    switch (action.content) {
      case SummaryContains.EmptyValueRequired:
        countsRef.current.notEmpty += amountToAdd;
        break;
      case SummaryContains.EmptyValueNotRequired:
        countsRef.current.empty += amountToAdd;
        break;
      case SummaryContains.SomeUserContent:
        countsRef.current.notEmpty += amountToAdd;
        break;
      case SummaryContains.Presentational:
        countsRef.current.presentational += amountToAdd;
        break;
    }

    const totalWithoutPresentational = countsRef.current.empty + countsRef.current.notEmpty;

    // Do not hide groups with only presentational content in them. We only do that when there are additional
    // components that could have had content in them.
    return totalWithoutPresentational > 0 && countsRef.current.empty === totalWithoutPresentational;
  }, false);

  // Reports to parent, since this is outside the context
  useReportSummaryRender(
    reportSelf
      ? onlyEmptyChildren
        ? SummaryContains.EmptyValueNotRequired
        : SummaryContains.SomeUserContent
      : undefined,
  );

  return <Context.Provider value={{ parent, onlyEmptyChildren, dispatch }}>{children}</Context.Provider>;
}

export function useHasOnlyEmptyChildren() {
  const context = React.useContext(Context);
  if (!context) {
    throw new Error('useHasOnlyEmptyChildren must be used within a EmptyChildrenBoundary');
  }

  return context.onlyEmptyChildren;
}

function useMarkRendering(ctx: EmptyChildrenContext | undefined, content: SummaryContains | undefined) {
  const dispatch = ctx?.dispatch;

  useLayoutEffect(() => {
    if (content) {
      dispatch?.({ when: 'mount', content });
      return () => dispatch?.({ when: 'unmount', content });
    }
  }, [dispatch, content]);
}

export function useReportSummaryRender(content: SummaryContains | undefined) {
  const ctx = React.useContext(Context);
  useMarkRendering(ctx, content);
}

export function useReportSummaryRenderToParent(content: SummaryContains | undefined) {
  const ctx = React.useContext(Context);
  useMarkRendering(ctx?.parent, content);
}

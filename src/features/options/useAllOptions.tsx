import React, { useEffect, useReducer } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';

import { useGetOptions } from 'src/features/options/useGetOptions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useRealTaskType } from 'src/hooks/useProcess';
import { ProcessTaskType } from 'src/types';
import { createStrictContext } from 'src/utils/createStrictContext';
import { useExprContext } from 'src/utils/layout/ExprContext';
import type { IOption } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * This file contains a Context that provides a global map of all options that have been fetched.
 * This is used in expressions and useDisplayData(), and will make sure to fetch all options even before
 * the page with the option-based component is rendered. This way we can use the 'displayValue' expression
 * function, and show summaries/PDF even if the source component has not been rendered yet.
 */
export type AllOptionsMap = { [nodeId: string]: IOption[] | undefined };
export const allOptions: AllOptionsMap = {};

const [Provider, useCtx] = createStrictContext<State>();

export const useAllOptions = () => useCtx().nodes;
export const useAllOptionsInitiallyLoaded = () => useCtx().allInitiallyLoaded;

interface State {
  allInitiallyLoaded: boolean;
  currentTaskId?: string;
  nodes: AllOptionsMap;
}
type Actions =
  | { type: 'nodeFetched'; nodeId: string; options: IOption[] }
  | { type: 'nodesFound'; nodesFound: string[] }
  | { type: 'setCurrentTask'; currentTaskId: string | undefined };

const reducer = (state: State, action: Actions) => {
  if (action.type === 'nodeFetched') {
    const existingOptions = state.nodes[action.nodeId];
    if (deepEqual(existingOptions, action.options)) {
      return state;
    }
    const newNodes = {
      ...state.nodes,
      [action.nodeId]: action.options,
    };
    return {
      ...state,
      allInitiallyLoaded: state.allInitiallyLoaded || Object.values(newNodes).every((v) => v),
      nodes: newNodes,
    };
  } else if (action.type === 'nodesFound') {
    if (state.allInitiallyLoaded) {
      return state;
    }

    const newNodes = { ...state.nodes };
    let changes = false;
    for (const nodeId of action.nodesFound) {
      if (newNodes[nodeId] === undefined) {
        newNodes[nodeId] = undefined;
        changes = true;
      }
    }
    if (action.nodesFound.length === 0) {
      return {
        ...state,
        allInitiallyLoaded: true,
      };
    }

    if (!changes) {
      return state;
    }
    return {
      ...state,
      allInitiallyLoaded: false,
      nodes: newNodes,
    };
  } else if (action.type === 'setCurrentTask') {
    if (state.currentTaskId === action.currentTaskId) {
      return state;
    }

    return {
      allInitiallyLoaded: false,
      currentTaskId: action.currentTaskId,
      nodes: {},
    };
  }

  return state;
};

function isNodeOptionBased(node: LayoutNode) {
  return (
    ('options' in node.item && node.item.options) ||
    ('optionsId' in node.item && node.item.optionsId) ||
    ('source' in node.item && node.item.source)
  );
}

export function AllOptionsProvider({ children }: PropsWithChildren) {
  const nodes = useExprContext();
  const currentTaskType = useRealTaskType();
  const currentTaskId = useAppSelector((state) => state.process.taskId) ?? undefined;
  const initialState: State = {
    allInitiallyLoaded: false,
    nodes: {},
    currentTaskId,
  };
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'setCurrentTask', currentTaskId });
  }, [currentTaskId]);

  useEffect(() => {
    // Update the global as well, so that we can use it in expressions
    for (const nodeId of Object.keys(state.nodes)) {
      allOptions[nodeId] = state.nodes[nodeId];
    }
  }, [state]);

  useEffect(() => {
    const nodesFound: string[] = [];
    if (nodes) {
      for (const node of nodes.allNodes()) {
        if (isNodeOptionBased(node)) {
          nodesFound.push(node.item.id);
        }
      }
    }

    // Make sure we dispatch if on the receipt page and other non-node based pages, so that we
    // stop loading options and show the page
    if (nodes || currentTaskType !== ProcessTaskType.Data) {
      dispatch({
        type: 'nodesFound',
        nodesFound,
      });
    }
  }, [nodes, currentTaskType]);

  return (
    <>
      {nodes
        ?.allNodes()
        .filter((n) => isNodeOptionBased(n))
        .map((node) => (
          <DummyOptionsSaver
            key={node.item.id}
            node={node}
            loadingDone={(options) => {
              dispatch({
                type: 'nodeFetched',
                nodeId: node.item.id,
                options,
              });
            }}
          />
        ))}
      <Provider value={state}>{children}</Provider>
    </>
  );
}

function DummyOptionsSaver({ node, loadingDone }: { node: LayoutNode; loadingDone: (options: IOption[]) => void }) {
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...node.item,
    node,
    formData: {
      // No need to implement support for preselectedOptionsIndex
      disable: 'I have read the code and know that core functionality will be missing',
    },
  });

  useEffect(() => {
    if (!isFetching) {
      loadingDone(calculatedOptions);
    }
  }, [isFetching, node.item.id, calculatedOptions, loadingDone]);

  return <></>;
}

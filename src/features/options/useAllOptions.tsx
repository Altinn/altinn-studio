import React, { useEffect, useReducer } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';

import { createContext } from 'src/core/contexts/context';
import { Loader } from 'src/core/loading/Loader';
import { useLaxProcessData, useRealTaskType } from 'src/features/instance/ProcessContext';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { ProcessTaskType } from 'src/types';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IOption } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * This file contains a Context that provides a global map of all options that have been fetched.
 * This is used in expressions and useDisplayData(), and will make sure to fetch all options even before
 * the page with the option-based component is rendered. This way we can use the 'displayValue' expression
 * function, and show summaries/PDF even if the source component has not been rendered yet.
 */
export type AllOptionsMap = { [nodeId: string]: IOption[] | undefined };

interface State {
  allInitiallyLoaded: boolean;
  currentTaskId?: string;
  nodes: AllOptionsMap;
}

interface Context {
  state: State;
  dispatch: React.Dispatch<Actions>;
}

const { Provider, useCtx } = createContext<Context>({ name: 'AllOptions', required: true });

export const useAllOptions = () => useCtx().state.nodes;
export const useAllOptionsInitiallyLoaded = () => useCtx().state.allInitiallyLoaded;

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

export function AllOptionsStoreProvider({ children }: PropsWithChildren) {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const initialState: State = {
    allInitiallyLoaded: false,
    nodes: {},
    currentTaskId,
  };
  const [state, dispatch] = useReducer(reducer, initialState);

  return <Provider value={{ state, dispatch }}>{children}</Provider>;
}

export function AllOptionsProvider({ children }: PropsWithChildren) {
  const nodes = useNodes();
  const currentTaskType = useRealTaskType();
  const { state, dispatch } = useCtx();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;

  useEffect(() => {
    dispatch({ type: 'setCurrentTask', currentTaskId });
  }, [currentTaskId, dispatch]);

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
  }, [nodes, currentTaskType, dispatch]);

  const dummies = nodes
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
    ));

  if (!state.allInitiallyLoaded) {
    return (
      <>
        {dummies}
        <Loader reason='all-options' />
      </>
    );
  }

  return (
    <>
      {dummies}
      {children}
    </>
  );
}

function DummyOptionsSaver({ node, loadingDone }: { node: LayoutNode; loadingDone: (options: IOption[]) => void }) {
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...node.item,
    node,
    valueType: 'single',
    dataModelBindings: undefined,
  });

  useEffect(() => {
    if (!isFetching) {
      loadingDone(calculatedOptions);
    }
  }, [isFetching, node.item.id, calculatedOptions, loadingDone]);

  return <></>;
}

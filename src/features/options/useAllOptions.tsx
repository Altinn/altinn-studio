import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';
import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
import { useLaxProcessData, useRealTaskType } from 'src/features/instance/ProcessContext';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { ProcessTaskType } from 'src/types';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * This file contains a Context that provides a global map of all options that have been fetched.
 * This is used in expressions and useDisplayData(), and will make sure to fetch all options even before
 * the page with the option-based component is rendered. This way we can use the 'displayValue' expression
 * function, and show summaries/PDF even if the source component has not been rendered yet.
 */
export type AllOptionsMap = { [nodeId: string]: IOptionInternal[] | undefined };

interface State {
  allInitiallyLoaded: boolean;
  currentTaskId?: string;
  nodes: AllOptionsMap;
}

interface Functions {
  setAllInitiallyLoaded: (allInitiallyLoaded: boolean) => void;
  setCurrentTaskId: (currentTaskId?: string) => void;
  setNodesFound: (nodesFound: string[]) => void;
  setNodeOptions: (nodeId: string, options: IOptionInternal[]) => void;
}

function isAllLoaded(nodes: AllOptionsMap, existingValue: boolean) {
  if (existingValue) {
    return true;
  }

  for (const options of Object.values(nodes)) {
    if (options === undefined) {
      return false;
    }
  }

  return true;
}

function newStore() {
  return createStore<State & Functions>((set) => ({
    allInitiallyLoaded: false,
    nodes: {},
    setAllInitiallyLoaded: (allInitiallyLoaded) => set({ allInitiallyLoaded }),
    setCurrentTaskId: (currentTaskId) => set({ currentTaskId }),
    setNodesFound: (nodesFound) => {
      set((state) => {
        if (state.allInitiallyLoaded) {
          return state;
        }
        const missingNodes = nodesFound.filter((nodeId) => !(nodeId in state.nodes));
        if (missingNodes.length === 0) {
          return { allInitiallyLoaded: isAllLoaded(state.nodes, state.allInitiallyLoaded) };
        }
        const newNodes = {
          ...state.nodes,
          ...Object.fromEntries(missingNodes.map((nodeId) => [nodeId, undefined])),
        };
        return {
          nodes: newNodes,
          allInitiallyLoaded: isAllLoaded(newNodes, state.allInitiallyLoaded),
        };
      });
    },
    setNodeOptions: (nodeId, options) =>
      set((state) => {
        if (deepEqual(state.nodes[nodeId], options)) {
          return state;
        }
        const newNodes = {
          ...state.nodes,
          [nodeId]: options,
        };
        return {
          nodes: newNodes,
          allInitiallyLoaded: isAllLoaded(newNodes, state.allInitiallyLoaded),
        };
      }),
  }));
}

const { Provider, useSelector } = createZustandContext<ReturnType<typeof newStore>>({
  name: 'AllOptions',
  required: true,
  initialCreateStore: newStore,
});

export const useAllOptions = () => useSelector((state) => state.nodes);
export const useAllOptionsInitiallyLoaded = () => useSelector((state) => state.allInitiallyLoaded);

function isNodeOptionBased(node: LayoutNode) {
  return (
    ('options' in node.item && node.item.options) ||
    ('optionsId' in node.item && node.item.optionsId) ||
    ('source' in node.item && node.item.source)
  );
}

export const AllOptionsStoreProvider = Provider;

export function AllOptionsProvider({ children }: PropsWithChildren) {
  const nodes = useNodes();
  const currentTaskType = useRealTaskType();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const setCurrentTaskId = useSelector((state) => state.setCurrentTaskId);
  const setNodesFound = useSelector((state) => state.setNodesFound);
  const setNodeOptions = useSelector((state) => state.setNodeOptions);
  const allInitiallyLoaded = useAllOptionsInitiallyLoaded();
  const allOptions = useAllOptions();

  useEffect(() => {
    setCurrentTaskId(currentTaskId);
  }, [currentTaskId, setCurrentTaskId]);

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
      setNodesFound(nodesFound);
    }
  }, [currentTaskType, nodes, setNodesFound]);

  const dummies = nodes
    ?.allNodes()
    .filter((n) => isNodeOptionBased(n))
    // Until allInitiallyLoaded is true, we want to wait for nodesFound to be set before we start fetching options
    .filter((n) => allInitiallyLoaded || Object.keys(allOptions).includes(n.item.id))
    .map((node) => (
      <DummyOptionsSaver
        key={node.item.id}
        node={node}
        loadingDone={(options) => {
          setNodeOptions(node.item.id, options);
        }}
      />
    ));

  if (!allInitiallyLoaded) {
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

function DummyOptionsSaver({
  node,
  loadingDone,
}: {
  node: LayoutNode;
  loadingDone: (options: IOptionInternal[]) => void;
}) {
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...node.item,
    node,

    // These don't really matter to us, but by setting them we effectively disable the 'preselectedOptionIndex'
    // functionality, and automatic resetting of stale values. We only want to fetch options here, not update the
    // data model in any way.
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

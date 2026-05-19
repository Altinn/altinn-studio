import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { PropsWithChildren, RefObject } from 'react';

import deepEqual from 'fast-deep-equal';
import { current } from 'immer';
import type { UnionToIntersection } from 'utility-types';

import { Loader } from 'src/core/loading/Loader';
import { AttachmentsStorePlugin } from 'src/features/attachments/AttachmentsStorePlugin';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { FormStore } from 'src/features/form/FormContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { pruneBoundaryMasks, ValidationStorePlugin } from 'src/features/validation/ValidationStorePlugin';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys } from 'src/routesBuilder';
import { GeneratorGlobalProvider, GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { useRegistry } from 'src/utils/layout/generator/GeneratorStages';
import { LayoutSetGenerator } from 'src/utils/layout/generator/LayoutSetGenerator';
import { GeneratorValidationProvider } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { nodesProduce } from 'src/utils/layout/nodesProduce';
import type { AttachmentsStorePluginConfig } from 'src/features/attachments/AttachmentsStorePlugin';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';
import type { ValidationStorePluginConfig } from 'src/features/validation/ValidationStorePlugin';
import type { CompTypes, ILayouts } from 'src/layout/layout';
import type { Registry } from 'src/utils/layout/generator/GeneratorStages';
import type { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { GeneratorErrors, NodeData } from 'src/utils/layout/types';

export interface PagesData {
  type: 'pages';
  pages: {
    [key: string]: PageData;
  };
}

export interface PageData {
  type: 'page';
  pageKey: string;
  errors: GeneratorErrors | undefined;
}

export type NodesStorePlugins = {
  validation: ValidationStorePluginConfig;
  attachments: AttachmentsStorePluginConfig;
};

const StorePlugins: { [K in keyof NodesStorePlugins]: NodeDataPlugin<NodesStorePlugins[K]> } = {
  validation: new ValidationStorePlugin(),
  attachments: new AttachmentsStorePlugin(),
};

type AllFlat<T> = UnionToIntersection<T extends Record<string, infer U> ? (U extends undefined ? never : U) : never>;
type ExtraFunctions = AllFlat<{
  [K in keyof NodesStorePlugins]: NodesStorePlugins[K]['extraFunctions'];
}>;
type ExtraHooks = AllFlat<{
  [K in keyof NodesStorePlugins]: NodesStorePlugins[K]['extraHooks'];
}>;

export interface AddNodeRequest<T extends CompTypes = CompTypes> {
  nodeId: string;
  targetState: NodeData<T>;
}

export interface RemoveNodeRequest {
  nodeId: string;
  layouts: ILayouts;
}

export interface SetNodePropRequest {
  nodeId: string;
  prop: string;
  value: unknown;
}

export type NodesSliceState = {
  hasErrors: boolean;
  pagesData: PagesData;
  nodeData: { [key: string]: NodeData };
  layouts: ILayouts | undefined; // Used to detect if the layouts have changed
  addNodes: (requests: AddNodeRequest[]) => void;
  removeNodes: (requests: RemoveNodeRequest[]) => void;
  setNodeProps: (requests: SetNodePropRequest[]) => void;
  addError: (error: string, id: string, type: 'node' | 'page') => void;

  addPage: (pageKey: string) => void;

  reset: (layouts: ILayouts) => void;
} & ExtraFunctions;

const defaultState = {
  hasErrors: false,
  pagesData: {
    type: 'pages' as const,
    pages: {},
  },
  nodeData: {},
};

export function createNodesSlice(set: FormStoreSet): FormStoreState['nodes'] {
  return {
    ...structuredClone(defaultState),

    layouts: undefined,

    addNodes: (requests) =>
      set((state) => {
        const nodeData = { ...state.nodes.nodeData };
        for (const { nodeId, targetState } of requests) {
          nodeData[nodeId] = targetState;
        }

        return { nodes: { ...state.nodes, nodeData } };
      }),
    removeNodes: (requests) =>
      set((state) => {
        let count = 0;
        for (const { nodeId, layouts } of requests) {
          if (!state.nodes.nodeData[nodeId]) {
            continue;
          }

          if (layouts !== current(state.nodes.layouts)) {
            // The layouts have changed since the request was added, so there's no need to remove the node (it was
            // automatically removed when resetting the NodesContext state upon the layout change)
            continue;
          }

          delete state.nodes.nodeData[nodeId];
          count += 1;
        }

        if (count > 0) {
          pruneBoundaryMasks(state);
        }
      }),
    setNodeProps: (requests) =>
      set((state) => {
        let changes = false;
        for (const { nodeId, prop, value } of requests) {
          if (!state.nodes.nodeData[nodeId]) {
            continue;
          }

          const thisNode = { ...state.nodes.nodeData[nodeId] };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thisNode[prop as any] = value;

          if (!deepEqual(state.nodes.nodeData[nodeId][prop], thisNode[prop])) {
            changes = true;
            state.nodes.nodeData[nodeId] = thisNode;
          }
        }
        if (changes) {
          pruneBoundaryMasks(state);
        }
      }),
    addError: (error, id, type) =>
      set(
        nodesProduce((state) => {
          const data = type === 'page' ? state.pagesData.pages[id] : state.nodeData[id];
          if (!data) {
            return;
          }
          if (!data.errors) {
            data.errors = {};
          }
          data.errors[error] = true;

          state.hasErrors = true;
        }),
      ),
    addPage: (pageKey) =>
      set(
        nodesProduce((state) => {
          if (state.pagesData.pages[pageKey]) {
            return;
          }

          state.pagesData.pages[pageKey] = {
            type: 'page',
            pageKey,
            errors: undefined,
          };
        }),
      ),

    reset: (layouts) =>
      set((state) => ({
        nodes: {
          ...state.nodes,
          ...structuredClone(defaultState),
          layouts,
        },
      })),

    ...(Object.values(StorePlugins)
      .map((plugin) => plugin.extraFunctions(set))
      .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraFunctions),
  };
}

export const NodesProvider = ({ children }: PropsWithChildren) => {
  const registry = useRegistry();

  return (
    <ProvideGlobalContext registry={registry}>
      <GeneratorValidationProvider>
        <LayoutSetGenerator />
      </GeneratorValidationProvider>
      {window.Cypress && <UpdateAttachmentsForCypress />}
      {children}
    </ProvideGlobalContext>
  );
};

function ProvideGlobalContext({ children, registry }: PropsWithChildren<{ registry: RefObject<Registry> }>) {
  const isInTaskTransition = useIsInTaskTransition();
  const latestLayouts = FormStore.bootstrap.useLayouts();
  const layouts = FormStore.raw.useSelector((state) => state.nodes.layouts);
  const reset = FormStore.raw.useSelector((state) => state.nodes.reset);

  useEffect(() => {
    if (layouts !== latestLayouts) {
      reset(latestLayouts);
    }
  }, [latestLayouts, layouts, reset]);

  const addNode = useCallback(
    (req: AddNodeRequest) => {
      registry.current.toCommit.addNodeRequests.push(req);
      registry.current.triggerAutoCommit?.((prev) => prev + 1);
    },
    [registry],
  );

  const removeNode = useCallback(
    (req: RemoveNodeRequest) => {
      registry.current.toCommit.removeNodeRequests.push(req);
      registry.current.triggerAutoCommit?.((prev) => prev + 1);
    },
    [registry],
  );

  const setNodeProp = useCallback(
    (req: SetNodePropRequest) => {
      registry.current.toCommit.nodePropsRequests.push(req);
      registry.current.triggerAutoCommit?.((prev) => prev + 1);
    },
    [registry],
  );

  if (layouts !== latestLayouts || isInTaskTransition) {
    // You changed the layouts, possibly by using devtools. Hold on while we re-generate!
    return <NodesLoader />;
  }

  return (
    <GeneratorGlobalProvider
      layouts={layouts}
      registry={registry}
      addNode={addNode}
      removeNode={removeNode}
      setNodeProp={setNodeProp}
    >
      <AutoCommit registry={registry} />
      {children}
    </GeneratorGlobalProvider>
  );
}

/**
 * When navigating to process/next, the taskId transitions to a new one. Layouts will be updated as well, but that
 * takes time. This hook returns true when in such a transition
 */
function useIsInTaskTransition() {
  const currentTask = useProcessQuery().data?.currentTask?.elementId;
  const taskIdFromUrl = useNavigationParam('taskId');

  if ([TaskKeys.ProcessEnd, TaskKeys.CustomReceipt].includes(taskIdFromUrl as TaskKeys) && !currentTask) {
    // Receipt indicates that the process ended - it cannot be compared directly with the taskId
    return false;
  }

  return currentTask !== taskIdFromUrl;
}

function AutoCommit({ registry }: { registry: RefObject<Registry> }) {
  const addNodes = FormStore.raw.useStaticSelector((state) => state.nodes.addNodes);
  const removeNodes = FormStore.raw.useStaticSelector((state) => state.nodes.removeNodes);
  const setNodeProps = FormStore.raw.useStaticSelector((state) => state.nodes.setNodeProps);
  const [renderCount, forceRender] = useState(0);

  const reg = registry.current;
  if (reg && reg.triggerAutoCommit !== forceRender) {
    // Store the trigger function in the registry so the parent can call it
    // eslint-disable-next-line react-compiler/react-compiler
    reg.triggerAutoCommit = forceRender;
  }

  useLayoutEffect(() => {
    if (registry.current.toCommit.addNodeRequests.length > 0) {
      addNodes(registry.current.toCommit.addNodeRequests);
      registry.current.toCommit.addNodeRequests.length = 0;
    }
    if (registry.current.toCommit.removeNodeRequests.length > 0) {
      removeNodes(registry.current.toCommit.removeNodeRequests);
      registry.current.toCommit.removeNodeRequests.length = 0;
    }
    if (registry.current.toCommit.nodePropsRequests.length > 0) {
      setNodeProps(registry.current.toCommit.nodePropsRequests);
      registry.current.toCommit.nodePropsRequests.length = 0;
    }
  }, [addNodes, removeNodes, setNodeProps, registry, renderCount]);

  return null;
}

function NodesLoader() {
  return <Loader reason='nodes' />;
}

/**
 * A set of tools, selectors and functions to use internally in node generator components.
 */
export const nodesHooks = {
  useFullErrorList() {
    return FormStore.raw.useMemoSelector((s) => {
      const errors: { [pageOrNode: string]: string[] } = {};

      for (const pageKey in s.nodes.pagesData.pages) {
        const page = s.nodes.pagesData.pages[pageKey];
        if (page.errors) {
          errors[`page/${pageKey}`] = Object.keys(page.errors);
        }
      }

      for (const nodeId in s.nodes.nodeData) {
        const node = s.nodes.nodeData[nodeId];
        if (node.errors) {
          errors[`node/${nodeId}`] = Object.keys(node.errors);
        }
      }

      return errors;
    });
  },
  useWaitUntilReady() {
    const registry = GeneratorInternal.useRegistry();

    return useCallback(async () => {
      const toCommit = registry.current.toCommit;
      let didWait = false;
      while (Object.values(toCommit).some((arr) => arr.length > 0)) {
        await new Promise((resolve) => setTimeout(resolve, 4));
        didWait = true;
      }

      // If we did wait, wait some more (until the commits have been stored)
      if (didWait) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }, [registry]);
  },

  useNodeErrors(nodeId: string | undefined) {
    return FormStore.raw.useSelector((s) => {
      if (!nodeId) {
        return undefined;
      }
      return s.nodes.nodeData[nodeId]?.errors;
    });
  },
  useNodeData<Id extends string | undefined, Type extends CompTypes, Out>(
    nodeId: Id,
    type: Type | undefined,
    selector: (nodeData: NodeData<Type>) => Out,
  ) {
    return FormStore.raw.useMemoSelector((s) => {
      if (!nodeId) {
        return undefined;
      }

      const data = s.nodes.nodeData[nodeId];
      if (data && type && data.nodeType !== type) {
        throw new Error(`Expected id ${nodeId} to be of type ${type}, but it is of type ${data.nodeType}`);
      }

      return data ? selector(data as NodeData<Type>) : undefined;
    }) as Id extends undefined ? Out | undefined : Out;
  },
  useIsAdded: (id: string | undefined, type: 'node' | 'page' | undefined) =>
    FormStore.raw.useSelector((s) => {
      if (!id) {
        return false;
      }
      if (type === undefined) {
        throw new Error('useIsAdded() requires an id and a type. When id is given, type has to be given too.');
      }
      if (type === 'page') {
        return s.nodes.pagesData.pages[id] !== undefined;
      }
      return s.nodes.nodeData[id] !== undefined;
    }),
  useHasErrors: () => FormStore.raw.useSelector((state) => state.nodes.hasErrors),

  useAddPage: () => FormStore.raw.useStaticSelector((state) => state.nodes.addPage),
  useAddError: () => FormStore.raw.useStaticSelector((state) => state.nodes.addError),

  ...(Object.values(StorePlugins)
    .map((plugin) => plugin.extraHooks())
    .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraHooks),
};

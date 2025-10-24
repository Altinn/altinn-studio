import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PropsWithChildren, RefObject } from 'react';

import deepEqual from 'fast-deep-equal';
import { produce } from 'immer';
import { createStore } from 'zustand';
import type { UnionToIntersection } from 'utility-types';
import type { StoreApi } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
import { AttachmentsStorePlugin } from 'src/features/attachments/AttachmentsStorePlugin';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { HiddenComponentsProvider } from 'src/features/form/dynamics/HiddenComponentsProvider';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { ExpressionValidation } from 'src/features/validation/expressionValidation/ExpressionValidation';
import {
  LoadingBlockerWaitForValidation,
  ProvideWaitForValidation,
  Validation,
} from 'src/features/validation/validationContext';
import { ValidationStorePlugin } from 'src/features/validation/ValidationStorePlugin';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { GeneratorGlobalProvider, GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { useRegistry } from 'src/utils/layout/generator/GeneratorStages';
import { LayoutSetGenerator } from 'src/utils/layout/generator/LayoutSetGenerator';
import { GeneratorValidationProvider } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import type { AttachmentsStorePluginConfig } from 'src/features/attachments/AttachmentsStorePlugin';
import type { ValidationsProcessedLast } from 'src/features/validation';
import type { ValidationStorePluginConfig } from 'src/features/validation/ValidationStorePlugin';
import type { ObjectOrArray } from 'src/hooks/useShallowMemo';
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

export type NodesContext = {
  hasErrors: boolean;
  pagesData: PagesData;
  nodeData: { [key: string]: NodeData };
  hiddenViaRules: { [key: string]: true | undefined };
  hiddenViaRulesRan: boolean;
  layouts: ILayouts | undefined; // Used to detect if the layouts have changed
  addNodes: (requests: AddNodeRequest[]) => void;
  removeNodes: (requests: RemoveNodeRequest[]) => void;
  setNodeProps: (requests: SetNodePropRequest[]) => void;
  addError: (error: string, id: string, type: 'node' | 'page') => void;
  markHiddenViaRule: (hiddenFields: { [nodeId: string]: true }) => void;

  addPage: (pageKey: string) => void;

  reset: (layouts: ILayouts, validationsProcessedLast: ValidationsProcessedLast) => void;
} & NodesProviderProps &
  ExtraFunctions;

/**
 * Using the inferred types in the immer produce() function here introduces a lot of typescript overhead, which slows
 * down development. Using this instead short-circuits the type-checking to make it fast again.
 */
export function nodesProduce(fn: (draft: NodesContext) => void) {
  return produce(fn) as unknown as Partial<NodesContext>;
}

interface CreateStoreProps extends NodesProviderProps {
  validationsProcessedLast: ValidationsProcessedLast;
}

export type NodesContextStore = StoreApi<NodesContext>;
export function createNodesDataStore({ validationsProcessedLast, ...props }: CreateStoreProps) {
  const defaultState = {
    hasErrors: false,
    pagesData: {
      type: 'pages' as const,
      pages: {},
    },
    nodeData: {},
    hiddenViaRules: {},
    // If there are no conditional rules, mark as already run to avoid blocking render
    hiddenViaRulesRan: !window.conditionalRuleHandlerObject,
    validationsProcessedLast,
  };

  return createStore<NodesContext>((set) => ({
    ...defaultState,
    ...props,

    layouts: undefined,

    markHiddenViaRule: (newState) =>
      set((state) => {
        if (deepEqual(state.hiddenViaRules, newState)) {
          return { hiddenViaRulesRan: true };
        }

        return { hiddenViaRules: newState, hiddenViaRulesRan: true };
      }),

    addNodes: (requests) =>
      set((state) => {
        const nodeData = { ...state.nodeData };
        for (const { nodeId, targetState } of requests) {
          nodeData[nodeId] = targetState;
        }

        return { nodeData };
      }),
    removeNodes: (requests) =>
      set((state) => {
        const nodeData = { ...state.nodeData };

        let count = 0;
        for (const { nodeId, layouts } of requests) {
          if (!nodeData[nodeId]) {
            continue;
          }

          if (layouts !== state.layouts) {
            // The layouts have changed since the request was added, so there's no need to remove the node (it was
            // automatically removed when resetting the NodesContext state upon the layout change)
            continue;
          }

          delete nodeData[nodeId];
          count += 1;
        }

        if (count === 0) {
          return {};
        }

        return { nodeData };
      }),
    setNodeProps: (requests) =>
      set((state) => {
        let changes = false;
        const nodeData = { ...state.nodeData };
        for (const { nodeId, prop, value } of requests) {
          if (!nodeData[nodeId]) {
            continue;
          }

          const thisNode = { ...nodeData[nodeId] };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thisNode[prop as any] = value;

          if (!deepEqual(nodeData[nodeId][prop], thisNode[prop])) {
            changes = true;
            nodeData[nodeId] = thisNode;
          }
        }
        return changes ? { nodeData } : {};
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

    reset: (layouts, validationsProcessedLast: ValidationsProcessedLast) =>
      set(() => {
        const newState = { ...structuredClone(defaultState), layouts, validationsProcessedLast };

        // Pre-populate all pages from layouts to avoid race condition where WhenParentAdded
        // checks for page existence before AddPage component's useLayoutEffect runs
        if (layouts) {
          for (const pageKey of Object.keys(layouts)) {
            newState.pagesData.pages[pageKey] = {
              type: 'page',
              pageKey,
              errors: undefined,
            };
          }
        }

        return newState;
      }),

    ...(Object.values(StorePlugins)
      .map((plugin) => plugin.extraFunctions(set))
      .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraFunctions),
  }));
}

const Store = createZustandContext<NodesContextStore, NodesContext>({
  name: 'Nodes',
  required: true,
  initialCreateStore: createNodesDataStore,
});

export const NodesStore = Store; // Should be considered internal, do not use unless you know what you're doing
export type NodesStoreFull = typeof Store;

interface NodesProviderProps extends PropsWithChildren {
  readOnly: boolean;
  isEmbedded: boolean;
}

export const NodesProvider = ({ children, ...props }: NodesProviderProps) => {
  const registry = useRegistry();
  const getProcessedLast = Validation.useGetProcessedLast();

  return (
    <Store.Provider
      {...props}
      validationsProcessedLast={getProcessedLast()}
    >
      <ProvideGlobalContext registry={registry}>
        <GeneratorValidationProvider>
          <GeneratorData.Provider>
            <LayoutSetGenerator />
          </GeneratorData.Provider>
        </GeneratorValidationProvider>
        {window.Cypress && <UpdateAttachmentsForCypress />}
        <HiddenComponentsProvider />
        <BlockUntilRulesRan>
          <ProvideWaitForValidation />
          <ExpressionValidation />
          <LoadingBlockerWaitForValidation>{children}</LoadingBlockerWaitForValidation>
        </BlockUntilRulesRan>
      </ProvideGlobalContext>
    </Store.Provider>
  );
};

function ProvideGlobalContext({ children, registry }: PropsWithChildren<{ registry: RefObject<Registry> }>) {
  const latestLayouts = useLayouts();
  const layouts = Store.useSelector((s) => s.layouts);
  const reset = Store.useSelector((s) => s.reset);
  const getProcessedLast = Validation.useGetProcessedLast();

  useEffect(() => {
    if (layouts !== latestLayouts) {
      reset(latestLayouts, getProcessedLast());
    }
  }, [latestLayouts, layouts, reset, getProcessedLast]);

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

  if (layouts !== latestLayouts) {
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

function AutoCommit({ registry }: { registry: RefObject<Registry> }) {
  const addNodes = Store.useStaticSelector((s) => s.addNodes);
  const removeNodes = Store.useStaticSelector((s) => s.removeNodes);
  const setNodeProps = Store.useStaticSelector((s) => s.setNodeProps);
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

function BlockUntilRulesRan({ children }: PropsWithChildren) {
  const hasBeenReady = useRef(false);
  const ready = Store.useSelector((state) => {
    if (state.hiddenViaRulesRan) {
      hasBeenReady.current = true;
      return true;
    }
    return hasBeenReady.current;
  });

  if (!ready) {
    return <NodesLoader />;
  }

  return children;
}

function NodesLoader() {
  return <Loader reason='nodes' />;
}

export function useIsHiddenByRules(nodeId: string) {
  return Store.useSelector((s) => s.hiddenViaRules[nodeId] ?? false);
}

export function useIsHiddenByRulesMulti(baseIds: string[]) {
  const idMutator = useComponentIdMutator();
  return Store.useShallowSelector((s) => {
    const hidden: { [baseId: string]: boolean | undefined } = {};
    for (const baseId of baseIds) {
      const nodeId = idMutator(baseId);
      hidden[baseId] = s.hiddenViaRules[nodeId] ?? false;
    }
    return hidden;
  });
}

/**
 * A set of tools, selectors and functions to use internally in node generator components.
 */
export const NodesInternal = {
  useIsReadOnly() {
    return Store.useSelector((s) => s.readOnly);
  },
  useIsEmbedded() {
    return Store.useSelector((s) => s.isEmbedded);
  },
  useFullErrorList() {
    return Store.useMemoSelector((s) => {
      const errors: { [pageOrNode: string]: string[] } = {};

      for (const pageKey in s.pagesData.pages) {
        const page = s.pagesData.pages[pageKey];
        if (page.errors) {
          errors[`page/${pageKey}`] = Object.keys(page.errors);
        }
      }

      for (const nodeId in s.nodeData) {
        const node = s.nodeData[nodeId];
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
    return Store.useSelector((s) => {
      if (!nodeId) {
        return undefined;
      }
      return s.nodeData[nodeId]?.errors;
    });
  },
  useNodeData<Id extends string | undefined, Type extends CompTypes, Out>(
    nodeId: Id,
    type: Type | undefined,
    selector: (nodeData: NodeData<Type>) => Out,
  ) {
    return Store.useMemoSelector((s) => {
      if (!nodeId) {
        return undefined;
      }

      const data = s.nodeData[nodeId];
      if (data && type && data.nodeType !== type) {
        throw new Error(`Expected id ${nodeId} to be of type ${type}, but it is of type ${data.nodeType}`);
      }

      return data ? selector(data as NodeData<Type>) : undefined;
    }) as Id extends undefined ? Out | undefined : Out;
  },
  useIsAdded: (id: string | undefined, type: 'node' | 'page' | undefined) =>
    Store.useSelector((s) => {
      if (!id) {
        return false;
      }
      if (type === undefined) {
        throw new Error('useIsAdded() requires an id and a type. When id is given, type has to be given too.');
      }
      if (type === 'page') {
        return s.pagesData.pages[id] !== undefined;
      }
      return s.nodeData[id] !== undefined;
    }),
  useHasErrors: () => Store.useSelector((s) => s.hasErrors),

  // Raw selectors, used when there are no other hooks that match your needs
  useSelector: <T,>(selector: (state: NodesContext) => T) => Store.useSelector(selector),
  useShallowSelector: <T extends ObjectOrArray>(selector: (state: NodesContext) => T) =>
    Store.useShallowSelector(selector),
  useMemoSelector: <T,>(selector: (state: NodesContext) => T) => Store.useMemoSelector(selector),
  useLaxMemoSelector: <T,>(selector: (state: NodesContext) => T) => Store.useLaxMemoSelector(selector),

  useStore: () => Store.useStore(),
  useAddPage: () => Store.useStaticSelector((s) => s.addPage),
  useAddError: () => Store.useStaticSelector((s) => s.addError),
  useMarkHiddenViaRule: () => Store.useStaticSelector((s) => s.markHiddenViaRule),

  ...(Object.values(StorePlugins)
    .map((plugin) => plugin.extraHooks(Store))
    .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraHooks),
};

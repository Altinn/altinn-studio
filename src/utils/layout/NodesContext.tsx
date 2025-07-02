import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';
import { produce } from 'immer';
import { createStore } from 'zustand';
import type { UnionToIntersection } from 'utility-types';
import type { StoreApi } from 'zustand';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
import { AttachmentsStorePlugin } from 'src/features/attachments/AttachmentsStorePlugin';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { HiddenComponentsProvider } from 'src/features/form/dynamics/HiddenComponentsProvider';
import { useLayoutLookups, useLayouts } from 'src/features/form/layout/LayoutsContext';
import { usePdfLayoutName, useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useIsCurrentView } from 'src/features/routing/AppRoutingContext';
import { ExpressionValidation } from 'src/features/validation/expressionValidation/ExpressionValidation';
import {
  LoadingBlockerWaitForValidation,
  ProvideWaitForValidation,
  Validation,
} from 'src/features/validation/validationContext';
import { ValidationStorePlugin } from 'src/features/validation/ValidationStorePlugin';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { getComponentDef } from 'src/layout';
import { useGetAwaitingCommits } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorDebug, generatorLog } from 'src/utils/layout/generator/debug';
import { GeneratorGlobalProvider, GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import {
  createStagesStore,
  GeneratorStages,
  GeneratorStagesEffects,
  useRegistry,
} from 'src/utils/layout/generator/GeneratorStages';
import { LayoutSetGenerator } from 'src/utils/layout/generator/LayoutSetGenerator';
import { GeneratorValidationProvider } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { AttachmentsStorePluginConfig } from 'src/features/attachments/AttachmentsStorePlugin';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { ValidationsProcessedLast } from 'src/features/validation';
import type { ValidationStorePluginConfig } from 'src/features/validation/ValidationStorePlugin';
import type { ObjectOrArray } from 'src/hooks/useShallowMemo';
import type { CompTypes, ILayouts } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { GeneratorStagesContext, Registry } from 'src/utils/layout/generator/GeneratorStages';
import type { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { GeneratorErrors, NodeData, NodeDataFromNode } from 'src/utils/layout/types';

export interface PagesData {
  type: 'pages';
  pages: {
    [key: string]: PageData;
  };
}

export interface PageData {
  type: 'page';
  pageKey: string;
  hidden: boolean;
  inOrder: boolean;
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
  node: LayoutNode<T>;
  targetState: NodeData<T>;
}

export interface RemoveNodeRequest<T extends CompTypes = CompTypes> {
  node: LayoutNode<T>;
  layouts: ILayouts;
}

export interface SetNodePropRequest<T extends CompTypes, K extends keyof NodeData<T>> {
  node: LayoutNode<T>;
  prop: K;
  value: NodeData<T>[K];
}

export interface SetPagePropRequest<K extends keyof PageData> {
  pageKey: string;
  prop: K;
  value: PageData[K];
}

export enum NodesReadiness {
  Ready = 'READY',
  NotReady = 'NOT READY',
}

export type NodesContext = {
  readiness: NodesReadiness;

  hasErrors: boolean;
  pagesData: PagesData;
  nodeData: { [key: string]: NodeData };
  prevNodeData: { [key: string]: NodeData } | undefined; // Earlier node data from before the state became non-ready
  hiddenViaRules: { [key: string]: true | undefined };
  hiddenViaRulesRan: boolean;

  layouts: ILayouts | undefined; // Used to detect if the layouts have changed
  stages: GeneratorStagesContext;

  addNodes: (requests: AddNodeRequest[]) => void;
  removeNodes: (request: RemoveNodeRequest[]) => void;
  setNodeProps: (requests: SetNodePropRequest<CompTypes, keyof NodeData>[]) => void;
  addError: (error: string, node: LayoutPage | LayoutNode) => void;
  markHiddenViaRule: (hiddenFields: { [nodeId: string]: true }) => void;

  addPage: (pageKey: string) => void;
  setPageProps: <K extends keyof PageData>(requests: SetPagePropRequest<K>[]) => void;
  markReady: (reason: string, readiness?: NodesReadiness) => void;

  reset: (layouts: ILayouts, validationsProcessedLast: ValidationsProcessedLast) => void;

  waitForCommits: undefined | (() => Promise<void>);
  setWaitForCommits: (waitForCommits: () => Promise<void>) => void;
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
  registry: MutableRefObject<Registry>;
}

export type NodesContextStore = StoreApi<NodesContext>;
export function createNodesDataStore({ registry, validationsProcessedLast, ...props }: CreateStoreProps) {
  const defaultState = {
    readiness: NodesReadiness.NotReady,
    hasErrors: false,
    pagesData: {
      type: 'pages' as const,
      pages: {},
    },
    nodeData: {},
    prevNodeData: {},
    hiddenViaRules: {},
    hiddenViaRulesRan: false,
    validationsProcessedLast,
  };

  return createStore<NodesContext>((set) => ({
    ...defaultState,
    ...props,

    layouts: undefined,
    stages: createStagesStore(registry, set),

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
        for (const { node, targetState } of requests) {
          nodeData[node.id] = targetState;
          node.page._addChild(node);
        }

        return {
          nodeData,
          readiness: NodesReadiness.NotReady,
        };
      }),
    removeNodes: (requests) =>
      set((state) => {
        const nodeData = { ...state.nodeData };

        let count = 0;
        for (const { node, layouts } of requests) {
          if (!nodeData[node.id]) {
            continue;
          }

          if (layouts !== state.layouts) {
            // The layouts have changed since the request was added, so there's no need to remove the node (it was
            // automatically removed when resetting the NodesContext state upon the layout change)
            continue;
          }

          delete nodeData[node.id];
          node.page._removeChild(node);
          count += 1;
        }

        if (count === 0) {
          return {};
        }

        return {
          nodeData,
          readiness: NodesReadiness.NotReady,
        };
      }),
    setNodeProps: (requests) =>
      set((state) => {
        let changes = false;
        const nodeData = { ...state.nodeData };
        for (const { node, prop, value } of requests) {
          if (!nodeData[node.id]) {
            continue;
          }

          const thisNode = { ...nodeData[node.id] };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thisNode[prop as any] = value;

          if (!deepEqual(nodeData[node.id][prop], thisNode[prop])) {
            changes = true;
            nodeData[node.id] = thisNode;
          }
        }
        return changes ? { nodeData } : {};
      }),
    addError: (error, node) =>
      set(
        nodesProduce((state) => {
          const data = node instanceof LayoutPage ? state.pagesData.pages[node.pageKey] : state.nodeData[node.id];

          if (!data) {
            return;
          }
          if (!data.errors) {
            data.errors = {};
          }
          data.errors[error] = true;

          // We need to mark the data as not ready as soon as an error is added, because GeneratorErrorBoundary
          // may need to remove the failing node from the tree before any more node traversal can happen safely.
          setReadiness({ state, target: NodesReadiness.NotReady, reason: `Error added`, mutate: true });

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
            hidden: false,
            inOrder: true,
            errors: undefined,
          };
          setReadiness({
            state,
            target: NodesReadiness.NotReady,
            reason: `New page added`,
            mutate: true,
          });
        }),
      ),
    setPageProps: (requests) =>
      set((state) => {
        const pageData = { ...state.pagesData.pages };
        for (const { pageKey, prop, value } of requests) {
          const obj = { ...pageData[pageKey] };
          if (!obj) {
            continue;
          }
          obj[prop] = value;
          pageData[pageKey] = obj;
        }
        return { pagesData: { type: 'pages', pages: pageData } };
      }),
    markReady: (reason, readiness = NodesReadiness.Ready) =>
      set((state) => setReadiness({ state, target: readiness, reason })),

    reset: (layouts, validationsProcessedLast: ValidationsProcessedLast) =>
      set(() => {
        generatorLog('logReadiness', 'Resetting state');
        return { ...structuredClone(defaultState), layouts, validationsProcessedLast };
      }),

    waitForCommits: undefined,
    setWaitForCommits: (waitForCommits) => set(() => ({ waitForCommits })),

    ...(Object.values(StorePlugins)
      .map((plugin) => plugin.extraFunctions(set))
      .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraFunctions),
  }));
}

interface SetReadinessProps {
  state: NodesContext;
  target: NodesReadiness;
  reason: string;
  mutate?: boolean;
}

/**
 * Helper function to set new readiness state. Never try to set a new readiness without going through this function.
 */
export function setReadiness({ state, target, reason, mutate = false }: SetReadinessProps): Partial<NodesContext> {
  const toSet: Partial<NodesContext> = {};
  if (state.readiness !== target) {
    generatorLog('logReadiness', `Marking state as ${target}: ${reason}`);
    toSet.readiness = target;
    if (target !== NodesReadiness.Ready && state.readiness === NodesReadiness.Ready) {
      // Making a copy of the nodeData from when the state was ready last, so that selectors can continue running
      // with the old data until the new data is ready. This should also make sure it doesn't accidentally copy
      // non-ready state if the readiness changes multiple times before becoming ready again.
      toSet.prevNodeData = state.nodeData;
    } else if (target === NodesReadiness.Ready) {
      toSet.prevNodeData = undefined;
    }
  }

  if (mutate) {
    for (const key in toSet) {
      state[key] = toSet[key];
    }
  }

  return toSet;
}

const Store = createZustandContext<NodesContextStore, NodesContext>({
  name: 'Nodes',
  required: true,
  initialCreateStore: createNodesDataStore,
});

export const NodesStore = Store; // Should be considered internal, do not use unless you know what you're doing
export type NodesStoreFull = typeof Store;

/**
 * A set of hooks for internal use that only selects new data when the data store is ready. When using these, your
 * component will not re-render during the generation stages, and such it will not risk selecting partially generated
 * data.
 */
const WhenReady = {
  useSelector: <T,>(selector: (state: NodesContext) => T): T | undefined => {
    const prevValue = useRef<T | typeof NeverInitialized>(NeverInitialized);
    return Store.useSelector((state) => whenReadySelector(state, selector, prevValue));
  },
  useMemoSelector: <T,>(selector: (state: NodesContext) => T): T | undefined => {
    const prevValue = useRef<T | typeof NeverInitialized>(NeverInitialized);
    return Store.useMemoSelector((state) => whenReadySelector(state, selector, prevValue));
  },
  useLaxSelector: <T,>(selector: (state: NodesContext) => T): T | typeof ContextNotProvided => {
    const prevValue = useRef<T | typeof ContextNotProvided | typeof NeverInitialized>(NeverInitialized);
    return Store.useLaxSelector((state) => whenReadySelector(state, selector, prevValue));
  },
  useLaxMemoSelector: <T,>(selector: (state: NodesContext) => T): T | typeof ContextNotProvided => {
    const prevValue = useRef<T | typeof ContextNotProvided | typeof NeverInitialized>(NeverInitialized);
    return Store.useLaxMemoSelector((state) => whenReadySelector(state, selector, prevValue));
  },
};

const NeverInitialized = Symbol('NeverInitialized');
function whenReadySelector<T>(
  state: NodesContext,
  selector: (state: NodesContext) => T,
  prevValue: MutableRefObject<T | typeof NeverInitialized>,
) {
  if (state.readiness === NodesReadiness.Ready || prevValue.current === NeverInitialized) {
    const value = selector(state);
    prevValue.current = value;
    return value;
  }
  return prevValue.current;
}

/**
 * Another set of hooks for internal use that will work different ways depending on the render context. If you use
 * these selectors inside GeneratorStages (aka. inside the node generation process), they will re-run every time the
 * store changes, even if the store is not ready. Thus you have to make due with partially generated data. However,
 * if you use these selectors outside of the generation stages, they will only re-run when the store is ready.
 */
const Conditionally = {
  useSelector: <T,>(selector: (state: NodesContext) => T): T | undefined => {
    const isGenerating = GeneratorInternal.useIsInsideGenerator();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useSelector(selector) : WhenReady.useSelector(selector);
  },
  useMemoSelector: <T,>(selector: (state: NodesContext) => T): T | undefined => {
    const isGenerating = GeneratorInternal.useIsInsideGenerator();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useMemoSelector(selector) : WhenReady.useMemoSelector(selector);
  },
  useLaxSelector: <T,>(selector: (state: NodesContext) => T): T | typeof ContextNotProvided => {
    const isGenerating = GeneratorInternal.useIsInsideGenerator();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useLaxSelector(selector) : WhenReady.useLaxSelector(selector);
  },
  useLaxMemoSelector: <T,>(selector: (state: NodesContext) => T): T | typeof ContextNotProvided => {
    const isGenerating = GeneratorInternal.useIsInsideGenerator();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useLaxMemoSelector(selector) : WhenReady.useLaxMemoSelector(selector);
  },
};

const { Provider: ProvideLayoutPages, useCtx: useLayoutPages } = createContext<LayoutPages>({
  name: 'LayoutPages',
  required: true,
});

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
      registry={registry}
      validationsProcessedLast={getProcessedLast()}
    >
      <ProvideGlobalContext registry={registry}>
        <GeneratorStagesEffects />
        <GeneratorValidationProvider>
          <GeneratorData.Provider>
            <LayoutSetGenerator />
          </GeneratorData.Provider>
        </GeneratorValidationProvider>
        <MarkAsReady />
        {window.Cypress && <UpdateAttachmentsForCypress />}
        <HiddenComponentsProvider />
        <BlockUntilLoaded>
          <ProvideWaitForValidation />
          <ExpressionValidation />
          <LoadingBlockerWaitForValidation>{children}</LoadingBlockerWaitForValidation>
        </BlockUntilLoaded>
        <IndicateReadiness />
      </ProvideGlobalContext>
    </Store.Provider>
  );
};

function ProvideGlobalContext({ children, registry }: PropsWithChildren<{ registry: MutableRefObject<Registry> }>) {
  const latestLayouts = useLayouts();
  const layouts = Store.useSelector((s) => s.layouts);
  const markNotReady = NodesInternal.useMarkNotReady();
  const reset = Store.useSelector((s) => s.reset);
  const getProcessedLast = Validation.useGetProcessedLast();
  const pagesRef = useRef<LayoutPages>();
  if (!pagesRef.current) {
    pagesRef.current = new LayoutPages();
  }

  useEffect(() => {
    if (layouts !== latestLayouts) {
      markNotReady('new layouts');
      pagesRef.current = new LayoutPages();
      reset(latestLayouts, getProcessedLast());
    }
  }, [latestLayouts, layouts, markNotReady, reset, getProcessedLast]);

  if (layouts !== latestLayouts) {
    // You changed the layouts, possibly by using devtools. Hold on while we re-generate!
    return <NodesLoader />;
  }

  return (
    <ProvideLayoutPages value={pagesRef.current}>
      <GeneratorGlobalProvider
        layouts={layouts}
        registry={registry}
      >
        {children}
      </GeneratorGlobalProvider>
    </ProvideLayoutPages>
  );
}

function IndicateReadiness() {
  const [readiness, hiddenViaRulesRan] = Store.useMemoSelector((s) => {
    const ready = s.readiness === NodesReadiness.Ready && s.hiddenViaRulesRan;

    // Doing this in a selector instead of a useEffect() so that we don't have to re-render
    document.body.setAttribute('data-nodes-ready', ready.toString());

    return [s.readiness, s.hiddenViaRulesRan];
  });

  useEffect(() => () => document.body.removeAttribute('data-nodes-ready'), []);

  if (!GeneratorDebug.displayReadiness) {
    return null;
  }

  return (
    <div
      role='status'
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: 'fit-content',
        padding: 5,
        backgroundColor: readiness === NodesReadiness.Ready ? 'lightgreen' : 'lightsalmon',
        fontWeight: 'bold',
        color: 'black',
      }}
    >
      {readiness === NodesReadiness.Ready && !hiddenViaRulesRan ? 'WAIT FOR RULES' : readiness}
    </div>
  );
}

/**
 * Some selectors (like NodeTraversal) only re-runs when the data store is 'ready', and when nodes start being added
 * or removed, the store is marked as not ready. This component will mark the store as ready when all nodes are added,
 * by waiting until after the render effects are done.
 *
 * This causes the node traversal selectors to re-run only when all nodes in a new repeating group row (and similar)
 * have been added.
 */
function MarkAsReady() {
  const store = Store.useStore();
  const markReady = Store.useSelector((s) => s.markReady);
  const readiness = Store.useSelector((s) => s.readiness);
  const hiddenViaRulesRan = Store.useSelector((s) => s.hiddenViaRulesRan);
  const stagesFinished = GeneratorStages.useIsFinished();
  const registry = GeneratorInternal.useRegistry();

  // Even though the getAwaitingCommits() function works on refs in the GeneratorStages context, the effects of such
  // commits always changes the NodesContext. Thus our useSelector() re-runs and re-renders this components when
  // commits are done.
  const getAwaitingCommits = useGetAwaitingCommits();

  const checkNodeStates = stagesFinished && hiddenViaRulesRan && readiness !== NodesReadiness.Ready;

  const nodeStateReady = Store.useSelector((state) => {
    if (!checkNodeStates) {
      return false;
    }

    return areAllNodesReady(state);
  });

  const maybeReady = checkNodeStates && nodeStateReady;

  useLayoutEffect(() => {
    if (maybeReady) {
      // Commits can happen where state is not really changed, and in those cases our useSelector() won't run, and we
      // won't notice that we could mark the state as ready again. For these cases we run intervals while the state
      // isn't ready.
      return setIdleInterval(registry, () => {
        const awaiting = getAwaitingCommits();
        if (awaiting > 0) {
          generatorLog('logReadiness', `Not quite ready yet (waiting for ${awaiting} commits)`);
          return false;
        }

        markReady('idle, nothing to commit');
        return true;
      });
    }

    return () => undefined;
  }, [maybeReady, getAwaitingCommits, markReady, registry, store]);

  return null;
}

function areAllNodesReady(state: NodesContext) {
  for (const nodeData of Object.values(state.nodeData)) {
    const def = getComponentDef(nodeData.nodeType) as LayoutComponent;
    const nodeReady = def.stateIsReady(nodeData);
    const pluginsReady = def.pluginStateIsReady(nodeData, state);
    if (!nodeReady || !pluginsReady) {
      generatorLog(
        'logReadiness',
        `Node ${nodeData.id} is not ready yet because of ` +
          `${nodeReady ? 'plugins' : pluginsReady ? 'node' : 'both node and plugins'}`,
      );
      return false;
    }
  }

  return true;
}

const IDLE_COUNTDOWN = 3;

/**
 * Utility that lets you register a function that will be called when the browser has been idle for
 * at least N consecutive iterations of requestIdleCallback(). Cancels itself when the function returns
 * true (otherwise it will continue to run), and returns a function to cancel the idle interval (upon unmounting).
 */
function setIdleInterval(registry: MutableRefObject<Registry>, fn: () => boolean): () => void {
  let lastCommitCount = registry.current.toCommitCount;
  let idleCountdown = IDLE_COUNTDOWN;
  let id: ReturnType<typeof requestIdleCallback | typeof requestAnimationFrame> | undefined;
  const request = window.requestIdleCallback || window.requestAnimationFrame;
  const cancel = window.cancelIdleCallback || window.cancelAnimationFrame;

  const runWhenIdle = () => {
    const currentCommitCount = registry.current.toCommitCount;
    if (currentCommitCount !== lastCommitCount) {
      // Something changed since last time, so we'll wait a bit more
      idleCountdown = IDLE_COUNTDOWN;
      lastCommitCount = currentCommitCount;
      id = request(runWhenIdle);
      return;
    }
    if (idleCountdown > 0) {
      // We'll wait until we've been idle (and did not get any new commits) for N iterations
      idleCountdown -= 1;
      id = request(runWhenIdle);
      return;
    }
    if (!fn()) {
      // The function didn't return true, so we'll wait a bit more
      id = request(runWhenIdle);
    }
  };

  id = request(runWhenIdle);

  return () => (id === undefined ? undefined : cancel(id));
}

function BlockUntilLoaded({ children }: PropsWithChildren) {
  const hasBeenReady = useRef(false);
  const ready = Store.useSelector((state) => {
    if (state.readiness === NodesReadiness.Ready) {
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

/**
 * Use the expression context. This will return a LayoutPages object containing the full tree of resolved
 * nodes (meaning, instances of layout components in a tree, with their expressions evaluated and resolved to
 * scalar values).
 *
 * Usually, if you're looking for a specific component/node, useResolvedNode() is better.
 */
export function useNode<T extends string | LayoutNode>(id: T): LayoutNode;
// eslint-disable-next-line no-redeclare
export function useNode<T extends string | undefined | LayoutNode>(id: T): LayoutNode | undefined;
// eslint-disable-next-line no-redeclare
export function useNode<T extends string | undefined | LayoutNode>(id: T): LayoutNode | undefined {
  const lastValue = useRef<LayoutNode | undefined | typeof NeverInitialized>(NeverInitialized);
  const nodes = useNodes();
  const node = Store.useSelector((state) => {
    if (!id) {
      return undefined;
    }

    if (state.readiness !== NodesReadiness.Ready && lastValue.current !== NeverInitialized) {
      return lastValue.current;
    }

    const node = id instanceof LayoutNode ? id : nodes.findById(id);
    lastValue.current = node;
    return node;
  });
  return node ?? undefined;
}

export const useGetPage = (pageId: string | undefined) => {
  const nodes = useNodes();
  return Store.useSelector(() => {
    if (!pageId) {
      return undefined;
    }

    if (!nodes) {
      return undefined;
    }
    return nodes.findLayout(pageId);
  });
};

export const useNodes = () => useLayoutPages();

export interface IsHiddenOptions {
  /**
   * Default = true. Set this to false to not check if DevTools have overridden hidden status.
   */
  respectDevTools?: boolean;

  /**
   * Default = false. Set this to true to consider pages hidden from the page order as actually hidden.
   */
  respectTracks?: boolean;

  /**
   * Default = false. Set this to true to force all hidden components to be visible (used by our DevTools).
   */
  forcedVisibleByDevTools?: boolean;
}

type AccessibleIsHiddenOptions = Omit<IsHiddenOptions, 'forcedVisibleByDevTools'>;

function withDefaults(options?: IsHiddenOptions): Required<IsHiddenOptions> {
  const { respectDevTools = true, respectTracks = false, forcedVisibleByDevTools = false } = options ?? {};
  return { respectDevTools, respectTracks, forcedVisibleByDevTools };
}

function isHiddenPage(state: NodesContext, pageKey: string | undefined, _options?: IsHiddenOptions) {
  const options = withDefaults(_options);
  if (!pageKey) {
    return true;
  }

  if (options.forcedVisibleByDevTools && options.respectDevTools) {
    return false;
  }

  const pageState = state.pagesData.pages[pageKey];
  const hidden = pageState?.hidden;
  if (hidden) {
    return true;
  }

  return options.respectTracks ? pageState?.inOrder === false : false;
}

export function isHidden(
  state: NodesContext,
  type: 'page' | 'node',
  id: string | undefined,
  lookups: LayoutLookups,
  _options?: IsHiddenOptions,
): boolean | undefined {
  if (!id) {
    return undefined;
  }

  if (type === 'page') {
    return isHiddenPage(state, id, _options);
  }

  const options = withDefaults(_options);
  if (options.forcedVisibleByDevTools && options.respectDevTools) {
    return false;
  }

  const pageKey = state.nodeData[id]?.pageKey;
  if (pageKey && isHiddenPage(state, pageKey, _options)) {
    return true;
  }

  const hidden = state.nodeData[id]?.hidden;
  if (hidden === undefined || hidden === true) {
    return hidden;
  }

  if (state.hiddenViaRules[id]) {
    return true;
  }

  const parentId = state.nodeData[id]?.parentId;
  const parent = parentId ? state.nodeData[parentId] : undefined;
  const parentDef = parent ? getComponentDef(parent.nodeType) : undefined;
  if (parent && parentDef && 'isChildHidden' in parentDef) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childHidden = parentDef.isChildHidden(parent as any, id, lookups);
    if (childHidden) {
      return true;
    }
  }

  if (parent) {
    return isHidden(state, 'node', parent.id, lookups, options);
  }

  return false;
}

function makeOptions(forcedVisibleByDevTools: boolean, options?: AccessibleIsHiddenOptions): IsHiddenOptions {
  return {
    ...options,
    forcedVisibleByDevTools,
  };
}

function useIsForcedVisibleByDevTools() {
  return useDevToolsStore((state) => state.isOpen && state.hiddenComponents !== 'hide');
}

export type IsHiddenSelector = ReturnType<typeof Hidden.useIsHiddenSelector>;
export const Hidden = {
  useIsHidden(nodeOrId: LayoutNode | LayoutPage | string | undefined, options?: AccessibleIsHiddenOptions) {
    const lookups = useLayoutLookups();
    const forcedVisibleByDevTools = useIsForcedVisibleByDevTools();
    const type = nodeOrId instanceof LayoutPage ? ('page' as const) : ('node' as const);
    const id =
      nodeOrId instanceof LayoutPage ? nodeOrId.pageKey : typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?.id;
    return WhenReady.useSelector((s) => isHidden(s, type, id, lookups, makeOptions(forcedVisibleByDevTools, options)));
  },
  useIsHiddenPage(page: LayoutPage | string | undefined, options?: AccessibleIsHiddenOptions) {
    const forcedVisibleByDevTools = useIsForcedVisibleByDevTools();
    return WhenReady.useSelector((s) => {
      const pageKey = page instanceof LayoutPage ? page.pageKey : page;
      return isHiddenPage(s, pageKey, makeOptions(forcedVisibleByDevTools, options));
    });
  },
  useIsHiddenPageSelector() {
    const forcedVisibleByDevTools = useIsForcedVisibleByDevTools();
    return Store.useDelayedSelector(
      {
        mode: 'simple',
        selector: (page: LayoutPage | string) => (state) => {
          const pageKey = page instanceof LayoutPage ? page.pageKey : page;
          return isHiddenPage(state, pageKey, makeOptions(forcedVisibleByDevTools));
        },
      },
      [forcedVisibleByDevTools],
    );
  },
  useHiddenPages(): Set<string> {
    const forcedVisibleByDevTools = useIsForcedVisibleByDevTools();
    const hiddenPages = WhenReady.useLaxMemoSelector((s) =>
      Object.keys(s.pagesData.pages).filter((key) => isHiddenPage(s, key, makeOptions(forcedVisibleByDevTools))),
    );
    return useMemo(() => new Set(hiddenPages === ContextNotProvided ? [] : hiddenPages), [hiddenPages]);
  },
  useIsHiddenSelector() {
    const forcedVisibleByDevTools = useIsForcedVisibleByDevTools();
    const lookups = useLayoutLookups();
    return Store.useDelayedSelector(
      {
        mode: 'simple',
        selector: (node: LayoutNode | LayoutPage | string, options?: IsHiddenOptions) => (state) => {
          const type = node instanceof LayoutPage ? ('page' as const) : ('node' as const);
          const id = node instanceof LayoutPage ? node.pageKey : typeof node === 'string' ? node : node?.id;
          return isHidden(state, type, id, lookups, makeOptions(forcedVisibleByDevTools, options));
        },
      },
      [forcedVisibleByDevTools],
    );
  },
  useIsHiddenSelectorProps() {
    const forcedVisibleByDevTools = useIsForcedVisibleByDevTools();
    const lookups = useLayoutLookups();
    return Store.useDelayedSelectorProps(
      {
        mode: 'simple',
        selector: (node: LayoutNode | LayoutPage | string, options?: IsHiddenOptions) => (state) => {
          const type = node instanceof LayoutPage ? ('page' as const) : ('node' as const);
          const id = node instanceof LayoutPage ? node.pageKey : typeof node === 'string' ? node : node?.id;
          return isHidden(state, type, id, lookups, makeOptions(forcedVisibleByDevTools, options));
        },
      },
      [forcedVisibleByDevTools],
    );
  },

  /**
   * The next ones are primarily for internal use:
   */
  useIsPageInOrder(pageKey: string) {
    const isCurrentView = useIsCurrentView(pageKey);
    const orderWithHidden = useRawPageOrder();
    const pdfLayoutName = usePdfLayoutName();

    if (isCurrentView) {
      // If this is the current view, then it's never hidden. This avoids settings fields as hidden when
      // code caused this to be the current view even if it's not in the common order.
      return true;
    }

    if (pdfLayoutName && pageKey === pdfLayoutName) {
      // If this is the pdf layout, then it's never hidden.
      return true;
    }

    return orderWithHidden.includes(pageKey);
  },

  /**
   * Iterate through a list of node IDs and find the first one that is not hidden
   */
  useFirstVisibleNode(nodeIds: string[]): string | undefined {
    const lookups = useLayoutLookups();
    return WhenReady.useSelector((state) => {
      for (const id of nodeIds) {
        if (!isHidden(state, 'node', id, lookups)) {
          return id;
        }
      }
      return undefined;
    });
  },
};

export type NodeDataSelector = ReturnType<typeof NodesInternal.useNodeDataSelector>;

export type NodeIdPicker = <T extends CompTypes = CompTypes>(
  id: string | undefined,
  type: T | undefined,
) => NodeData<T> | undefined;

function selectNodeData<T extends CompTypes = CompTypes>(
  id: string | undefined,
  type: T | undefined,
  state: NodesContext,
  preferFreshData = false,
): NodeData<T> | undefined {
  if (!id) {
    return undefined;
  }

  const data =
    state.readiness === NodesReadiness.Ready
      ? state.nodeData[id] // Always use fresh data when ready
      : preferFreshData && state.nodeData[id]
        ? state.nodeData[id]
        : state.prevNodeData?.[id]
          ? state.prevNodeData[id]
          : state.nodeData[id]; // Fall back to fresh data if prevNodeData is not set

  if (data && type && data.nodeType !== type) {
    return undefined;
  }

  return data as NodeData<T>;
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
  useIsReadyRef() {
    const ref = useRef(true); // Defaults to true if context is not provided
    Store.useLaxSelectorAsRef((s) => {
      ref.current = s.readiness === NodesReadiness.Ready && s.hiddenViaRulesRan;
    });
    return ref;
  },
  useWaitUntilReady() {
    const store = Store.useLaxStore();
    const waitForState = useWaitForState<undefined, NodesContext | typeof ContextNotProvided>(store);
    const waitForCommits = Store.useLaxSelector((s) => s.waitForCommits);
    return useCallback(async () => {
      await waitForState((state) => {
        if (state === ContextNotProvided) {
          return true;
        }
        return state.readiness === NodesReadiness.Ready && state.hiddenViaRulesRan;
      });
      if (waitForCommits && waitForCommits !== ContextNotProvided) {
        await waitForCommits();
      }
    }, [waitForState, waitForCommits]);
  },
  useMarkNotReady() {
    const markReady = Store.useSelector((s) => s.markReady);
    return useCallback(
      (reason?: string) => markReady(reason ?? 'from useMarkNotReady', NodesReadiness.NotReady),
      [markReady],
    );
  },
  /**
   * Like a useEffect, but only runs the effect when the nodes context is ready.
   */
  useEffectWhenReady(effect: Parameters<typeof useEffect>[0], deps: Parameters<typeof useEffect>[1]) {
    const [force, setForceReRun] = useState(0);
    const getAwaiting = useGetAwaitingCommits();
    const isReadyRef = NodesInternal.useIsReadyRef();
    const waitUntilReady = NodesInternal.useWaitUntilReady();

    useEffect(() => {
      const isReady = isReadyRef.current;
      if (!isReady) {
        waitUntilReady().then(() => {
          // We need to force a rerender to run the effect. If we didn't, the effect would never run.
          setForceReRun((v) => v + 1);
        });
        return;
      }
      const awaiting = getAwaiting();
      if (awaiting) {
        // If we are awaiting commits, we need to wait until they are done before we can run the effect.
        const timeout = setTimeout(() => setForceReRun((v) => v + 1), 100);
        return () => clearTimeout(timeout);
      }

      return effect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [force, ...(deps ?? [])]);
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

  useNodeErrors(node: LayoutNode | undefined) {
    return Store.useSelector((s) => {
      if (!node) {
        return undefined;
      }
      return s.nodeData[node.id]?.errors;
    });
  },

  useNodeDataWhenType<T extends CompTypes, Out>(
    nodeId: string | undefined,
    type: T,
    selector: (nodeData: NodeData<T>) => Out,
  ) {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Conditionally.useMemoSelector((s) => {
      if (!nodeId) {
        return undefined;
      }

      const data =
        insideGenerator && s.nodeData[nodeId]
          ? s.nodeData[nodeId]
          : s.readiness === NodesReadiness.Ready
            ? s.nodeData[nodeId]
            : (s.prevNodeData?.[nodeId] ?? s.nodeData[nodeId]);

      if (!data || data.nodeType !== type) {
        return undefined;
      }

      return selector(data as NodeData<T>);
    });
  },
  useNodeData<N extends LayoutNode | undefined, Out>(
    node: N,
    selector: (nodeData: NodeDataFromNode<N>, readiness: NodesReadiness, fullState: NodesContext) => Out,
  ) {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Conditionally.useMemoSelector((s) => {
      if (!node) {
        return undefined;
      }
      const data =
        insideGenerator && s.nodeData[node.id]
          ? s.nodeData[node.id]
          : s.readiness === NodesReadiness.Ready
            ? s.nodeData[node.id]
            : (s.prevNodeData?.[node.id] ?? s.nodeData[node.id]);

      return data ? selector(data as NodeDataFromNode<N>, s.readiness, s) : undefined;
    }) as N extends undefined ? Out | undefined : Out;
  },
  useNodeDataSelector: () => {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Store.useDelayedSelector({
      mode: 'innerSelector',
      makeArgs: (state) => [
        ((id, type = undefined) => selectNodeData(id, type, state, insideGenerator)) satisfies NodeIdPicker,
      ],
    });
  },
  useNodeDataSelectorProps: () => {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Store.useDelayedSelectorProps({
      mode: 'innerSelector',
      makeArgs: (state) => [
        ((id, type = undefined) => selectNodeData(id, type, state, insideGenerator)) satisfies NodeIdPicker,
      ],
    });
  },
  useIsAdded: (node: LayoutNode | LayoutPage | undefined) =>
    Store.useSelector((s) => {
      if (!node) {
        return false;
      }
      if (node instanceof LayoutPage) {
        return s.pagesData.pages[node.pageKey] !== undefined;
      }
      return s.nodeData[node.id] !== undefined;
    }),
  useHasErrors: () => Store.useSelector((s) => s.hasErrors),

  // Raw selectors, used when there are no other hooks that match your needs
  useSelector: <T,>(selector: (state: NodesContext) => T) => Store.useSelector(selector),
  useShallowSelector: <T extends ObjectOrArray>(selector: (state: NodesContext) => T) =>
    Store.useShallowSelector(selector),
  useMemoSelector: <T,>(selector: (state: NodesContext) => T) => Store.useMemoSelector(selector),
  useLaxMemoSelector: <T,>(selector: (state: NodesContext) => T) => Store.useLaxMemoSelector(selector),

  useStore: () => Store.useStore(),
  useSetNodeProps: () => Store.useStaticSelector((s) => s.setNodeProps),
  useAddPage: () => Store.useStaticSelector((s) => s.addPage),
  useSetPageProps: () => Store.useStaticSelector((s) => s.setPageProps),
  useAddNodes: () => Store.useStaticSelector((s) => s.addNodes),
  useRemoveNodes: () => Store.useStaticSelector((s) => s.removeNodes),
  useAddError: () => Store.useStaticSelector((s) => s.addError),
  useMarkHiddenViaRule: () => Store.useStaticSelector((s) => s.markHiddenViaRule),
  useSetWaitForCommits: () => Store.useStaticSelector((s) => s.setWaitForCommits),

  ...(Object.values(StorePlugins)
    .map((plugin) => plugin.extraHooks(Store))
    .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraHooks),
};

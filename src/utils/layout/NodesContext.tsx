import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';
import { produce } from 'immer';
import { createStore } from 'zustand';
import type { UnionToIntersection } from 'utility-types';
import type { StoreApi } from 'zustand';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { DataLoadingState, useDataLoadingStore } from 'src/core/contexts/dataLoadingContext';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
import { AttachmentsStorePlugin } from 'src/features/attachments/AttachmentsStorePlugin';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { HiddenComponentsProvider } from 'src/features/form/dynamics/HiddenComponentsProvider';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { usePdfLayoutName, useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { OptionsStorePlugin } from 'src/features/options/OptionsStorePlugin';
import { useIsCurrentView } from 'src/features/routing/AppRoutingContext';
import { ExpressionValidation } from 'src/features/validation/expressionValidation/ExpressionValidation';
import {
  LoadingBlockerWaitForValidation,
  ProvideWaitForValidation,
  Validation,
} from 'src/features/validation/validationContext';
import { ValidationStorePlugin } from 'src/features/validation/ValidationStorePlugin';
import { SelectorStrictness, useDelayedSelector } from 'src/hooks/delayedSelectors';
import { useAsRef } from 'src/hooks/useAsRef';
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
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import { RepeatingChildrenStorePlugin } from 'src/utils/layout/plugins/RepeatingChildrenStorePlugin';
import { TraversalTask } from 'src/utils/layout/useNodeTraversal';
import type { AttachmentsStorePluginConfig } from 'src/features/attachments/AttachmentsStorePlugin';
import type { OptionsStorePluginConfig } from 'src/features/options/OptionsStorePlugin';
import type { ValidationsProcessedLast } from 'src/features/validation';
import type { ValidationStorePluginConfig } from 'src/features/validation/ValidationStorePlugin';
import type { DSProps, DSReturn, InnerSelectorMode, OnlyReRenderWhen } from 'src/hooks/delayedSelectors';
import type { ObjectOrArray } from 'src/hooks/useShallowMemo';
import type { WaitForState } from 'src/hooks/useWaitForState';
import type { CompExternal, CompTypes, ILayouts } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { GeneratorStagesContext, Registry } from 'src/utils/layout/generator/GeneratorStages';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { RepeatingChildrenStorePluginConfig } from 'src/utils/layout/plugins/RepeatingChildrenStorePlugin';
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
  options: OptionsStorePluginConfig;
  attachments: AttachmentsStorePluginConfig;
  repeatingChildren: RepeatingChildrenStorePluginConfig;
};

const StorePlugins: { [K in keyof NodesStorePlugins]: NodeDataPlugin<NodesStorePlugins[K]> } = {
  validation: new ValidationStorePlugin(),
  options: new OptionsStorePlugin(),
  attachments: new AttachmentsStorePlugin(),
  repeatingChildren: new RepeatingChildrenStorePlugin(),
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
  partial?: boolean;
  force?: boolean;
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

  // Counter to prevent re-rendering of NodeTraversal when expressions/options/validations change
  addRemoveCounter: number;

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
} & ExtraFunctions;

/**
 * Using the inferred types in the immer produce() function here introduces a lot of typescript overhead, which slows
 * down development. Using this instead short-circuits the type-checking to make it fast again.
 */
export function nodesProduce(fn: (draft: NodesContext) => void) {
  return produce(fn) as unknown as Partial<NodesContext>;
}

interface CreateStoreProps {
  validationsProcessedLast: ValidationsProcessedLast;
  registry: MutableRefObject<Registry>;
}

export type NodesContextStore = StoreApi<NodesContext>;
export function createNodesDataStore({ registry, validationsProcessedLast }: CreateStoreProps) {
  const defaultState = {
    readiness: NodesReadiness.NotReady,
    addRemoveCounter: 0,
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
          addRemoveCounter: state.addRemoveCounter + 1,
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
          addRemoveCounter: state.addRemoveCounter + 1,
        };
      }),
    setNodeProps: (requests) =>
      set((state) => {
        let changes = false;
        const nodeData = { ...state.nodeData };
        for (const { node, prop, value, partial, force } of requests) {
          if (!nodeData[node.id]) {
            continue;
          }

          const thisNode = { ...nodeData[node.id] };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prev = thisNode[prop as any];

          if (partial && value && prev && typeof prev === 'object' && typeof value === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            thisNode[prop as any] = { ...thisNode[prop as any], ...value };
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            thisNode[prop as any] = value;
          }

          if (force || !deepEqual(nodeData[node.id][prop], thisNode[prop])) {
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
            newNodes: true,
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
  newNodes?: boolean;
  mutate?: boolean;
}

/**
 * Helper function to set new readiness state. Never try to set a new readiness without going through this function.
 */
export function setReadiness({
  state,
  target,
  reason,
  newNodes = false,
  mutate = false,
}: SetReadinessProps): Partial<NodesContext> {
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
    if (newNodes) {
      toSet.addRemoveCounter = state.addRemoveCounter + 1;
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

const {
  Provider: ProvideLayoutPages,
  useCtx: useLayoutPages,
  useLaxCtx: useLaxLayoutPages,
} = createContext<LayoutPages>({
  name: 'LayoutPages',
  required: true,
});

export const NodesProvider = ({ children }: React.PropsWithChildren) => {
  const registry = useRegistry();
  const getProcessedLast = Validation.useGetProcessedLast();

  return (
    <Store.Provider
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

  const layoutMap = useMemo(() => {
    const out: { [id: string]: CompExternal } = {};
    for (const page of Object.values(latestLayouts)) {
      if (!page) {
        continue;
      }
      for (const component of page) {
        out[component.id] = component;
      }
    }

    return out;
  }, [latestLayouts]);

  if (layouts !== latestLayouts) {
    // You changed the layouts, possibly by using devtools. Hold on while we re-generate!
    return <NodesLoader />;
  }

  return (
    <ProvideLayoutPages value={pagesRef.current}>
      <GeneratorGlobalProvider
        layouts={layouts}
        layoutMap={layoutMap}
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

  const setDataElements = useDataLoadingStore((state) => state.setDataElements);
  const dataElements = useDataLoadingStore((state) => state.dataElements);
  const overriddenDataModelUuid = useTaskStore((state) => state.overriddenDataModelUuid);

  useEffect(() => () => document.body.removeAttribute('data-nodes-ready'), []);

  const ready = readiness === NodesReadiness.Ready;
  useEffect(() => {
    if (
      ready &&
      overriddenDataModelUuid &&
      (!(overriddenDataModelUuid in dataElements) || dataElements[overriddenDataModelUuid] !== DataLoadingState.Ready)
    ) {
      setDataElements({ [overriddenDataModelUuid]: DataLoadingState.Ready });
    }
  }, [dataElements, overriddenDataModelUuid, ready, setDataElements]);

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
    const def = getComponentDef(nodeData.layout.type) as LayoutComponent;
    const nodeReady = def.stateIsReady(nodeData);
    const pluginsReady = def.pluginStateIsReady(nodeData, state);
    if (!nodeReady || !pluginsReady) {
      generatorLog(
        'logReadiness',
        `Node ${nodeData.layout.id} is not ready yet because of ` +
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

    const node = id instanceof BaseLayoutNode ? id : nodes.findById(id);
    lastValue.current = node;
    return node;
  });
  return node ?? undefined;
}

export const useGetPage = (pageId: string | undefined) => {
  const nodes = useNodes();
  return Store.useSelector((state) => {
    if (!pageId) {
      return undefined;
    }

    if (!nodes) {
      return undefined;
    }
    return nodes.findLayout(new TraversalTask(state, nodes, undefined, undefined), pageId);
  });
};

export const useNodes = () => useLayoutPages();
export const useNodesLax = () => {
  const out = useLaxLayoutPages();
  return out === ContextNotProvided ? undefined : out;
};

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
  _options?: IsHiddenOptions,
): boolean | undefined {
  if (!id) {
    return undefined;
  }

  if (type === 'page') {
    return isHiddenPage(state, id, _options);
  }

  const pageKey = state.nodeData[id]?.pageKey;
  if (pageKey && isHiddenPage(state, pageKey, _options)) {
    return true;
  }

  const options = withDefaults(_options);
  if (options.forcedVisibleByDevTools && options.respectDevTools) {
    return false;
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
  const parentDef = parent ? getComponentDef(parent.layout.type) : undefined;
  if (parent && parentDef && 'isChildHidden' in parentDef) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childHidden = parentDef.isChildHidden(parent as any, id);
    if (childHidden) {
      return true;
    }
  }

  if (parent) {
    return isHidden(state, 'node', parent.layout.id, options);
  }

  return false;
}

function makeOptions(forcedVisibleByDevTools: boolean, options?: AccessibleIsHiddenOptions): IsHiddenOptions {
  return {
    ...options,
    forcedVisibleByDevTools,
  };
}

export type IsHiddenSelector = ReturnType<typeof Hidden.useIsHiddenSelector>;
export const Hidden = {
  useIsHidden(node: LayoutNode | LayoutPage | undefined, options?: AccessibleIsHiddenOptions) {
    const forcedVisibleByDevTools = GeneratorData.useIsForcedVisibleByDevTools();
    const type = node instanceof LayoutPage ? ('page' as const) : ('node' as const);
    const id = node instanceof LayoutPage ? node.pageKey : node?.id;
    return WhenReady.useSelector((s) => isHidden(s, type, id, makeOptions(forcedVisibleByDevTools, options)));
  },
  useIsHiddenPage(page: LayoutPage | string | undefined, options?: AccessibleIsHiddenOptions) {
    const forcedVisibleByDevTools = GeneratorData.useIsForcedVisibleByDevTools();
    return WhenReady.useSelector((s) => {
      const pageKey = page instanceof LayoutPage ? page.pageKey : page;
      return isHiddenPage(s, pageKey, makeOptions(forcedVisibleByDevTools, options));
    });
  },
  useIsHiddenPageSelector() {
    const forcedVisibleByDevTools = GeneratorData.useIsForcedVisibleByDevTools();
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
    const forcedVisibleByDevTools = GeneratorData.useIsForcedVisibleByDevTools();
    const hiddenPages = WhenReady.useLaxMemoSelector((s) =>
      Object.keys(s.pagesData.pages).filter((key) => isHiddenPage(s, key, makeOptions(forcedVisibleByDevTools))),
    );
    return useMemo(() => new Set(hiddenPages === ContextNotProvided ? [] : hiddenPages), [hiddenPages]);
  },
  useIsHiddenSelector() {
    const forcedVisibleByDevTools = GeneratorData.useIsForcedVisibleByDevTools();
    return Store.useDelayedSelector(
      {
        mode: 'simple',
        selector: (node: LayoutNode | LayoutPage | string, options?: IsHiddenOptions) => (state) => {
          const type = node instanceof LayoutPage ? ('page' as const) : ('node' as const);
          const id = node instanceof LayoutPage ? node.pageKey : typeof node === 'string' ? node : node?.id;
          return isHidden(state, type, id, makeOptions(forcedVisibleByDevTools, options));
        },
      },
      [forcedVisibleByDevTools],
    );
  },
  useIsHiddenSelectorProps() {
    const forcedVisibleByDevTools = GeneratorData.useIsForcedVisibleByDevTools();
    return Store.useDelayedSelectorProps(
      {
        mode: 'simple',
        selector: (node: LayoutNode | LayoutPage | string, options?: IsHiddenOptions) => (state) => {
          const type = node instanceof LayoutPage ? ('page' as const) : ('node' as const);
          const id = node instanceof LayoutPage ? node.pageKey : typeof node === 'string' ? node : node?.id;
          return isHidden(state, type, id, makeOptions(forcedVisibleByDevTools, options));
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
};

export type NodeDataSelector = ReturnType<typeof NodesInternal.useNodeDataSelector>;
export type LaxNodeDataSelector = ReturnType<typeof NodesInternal.useLaxNodeDataSelector>;

export type NodePicker = <N extends LayoutNode | undefined = LayoutNode | undefined>(
  node: N | string,
) => NodePickerReturns<N>;
type NodePickerReturns<N extends LayoutNode | undefined> = NodeDataFromNode<N> | undefined;

function selectNodeData<N extends LayoutNode | undefined>(
  node: N | string,
  state: NodesContext,
  preferFreshData = false,
): NodePickerReturns<N> {
  const nodeId = typeof node === 'string' ? node : node?.id;
  if (!nodeId) {
    return undefined;
  }

  const data =
    state.readiness === NodesReadiness.Ready
      ? state.nodeData[nodeId] // Always use fresh data when ready
      : preferFreshData && state.nodeData[nodeId]?.item?.id // Only allow getting fresh data when not ready if item is set
        ? state.nodeData[nodeId]
        : state.prevNodeData?.[nodeId]
          ? state.prevNodeData[nodeId]
          : state.nodeData[nodeId]; // Fall back to fresh data if prevNodeData is not set

  return data as NodePickerReturns<N>;
}

function getNodeData<N extends LayoutNode | undefined, Out>(
  node: N | string,
  state: NodesContext,
  selector: (nodeData: NodeDataFromNode<N>) => Out,
  preferFreshData = false,
) {
  return node ? selector(selectNodeData(node, state, preferFreshData) as NodeDataFromNode<N>) : undefined;
}

/**
 * A set of tools, selectors and functions to use internally in node generator components.
 */
export const NodesInternal = {
  /**
   * This is a special selector that will only re-render when the number of nodes that have been added/removed
   * increases AND the selector would return a different result.
   *
   * This is useful for node traversal, which only needs to re-run when a node is added or removed, but don't care about
   * expressions that are solved within. Also, the selectors will always return ContextNotProvided when the nodes
   * are not ready yet.
   */
  useDataSelectorForTraversal(): DSReturn<{
    store: StoreApi<NodesContext>;
    strictness: SelectorStrictness.returnWhenNotProvided;
    mode: InnerSelectorMode<NodesContext, [NodesContext]>;
  }> {
    return useDelayedSelector({
      store: Store.useLaxStore(),
      strictness: SelectorStrictness.returnWhenNotProvided,
      onlyReRenderWhen: ((state, lastValue, setNewValue) => {
        if (state.readiness !== NodesReadiness.Ready) {
          return false;
        }
        if (lastValue !== state.addRemoveCounter) {
          setNewValue(state.addRemoveCounter);
          return true;
        }
        return false;
      }) satisfies OnlyReRenderWhen<NodesContext, number>,
      mode: {
        mode: 'innerSelector',
        makeArgs: (state) => [state],
      } satisfies InnerSelectorMode<NodesContext, [NodesContext]>,
    });
  },
  useDataSelectorForTraversalProps(): DSProps<{
    store: StoreApi<NodesContext> | typeof ContextNotProvided;
    strictness: SelectorStrictness.returnWhenNotProvided;
    mode: InnerSelectorMode<NodesContext, [NodesContext]>;
  }> {
    return {
      store: Store.useLaxStore(),
      strictness: SelectorStrictness.returnWhenNotProvided,
      onlyReRenderWhen: ((state, lastValue, setNewValue) => {
        if (state.readiness !== NodesReadiness.Ready) {
          return false;
        }
        if (lastValue !== state.addRemoveCounter) {
          setNewValue(state.addRemoveCounter);
          return true;
        }
        return false;
      }) satisfies OnlyReRenderWhen<NodesContext, number>,
      mode: {
        mode: 'innerSelector',
        makeArgs: (state) => [state],
      } satisfies InnerSelectorMode<NodesContext, [NodesContext]>,
    };
  },
  useIsReady() {
    const isReady = Store.useLaxSelector((s) => s.readiness === NodesReadiness.Ready && s.hiddenViaRulesRan);
    if (isReady === ContextNotProvided) {
      return true;
    }
    return isReady;
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
  useGetNodeData<N extends LayoutNode | undefined, Out>(
    node: N,
    selector: (state: NodeDataFromNode<N>) => Out,
  ): () => Out | undefined {
    const store = Store.useStore();
    const selectorRef = useAsRef(selector);
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return useCallback(
      () => getNodeData(node, store.getState(), (nodeData) => selectorRef.current(nodeData), insideGenerator),
      [store, node, selectorRef, insideGenerator],
    );
  },
  useWaitForNodeData<RetVal, N extends LayoutNode | undefined, Out>(
    node: N,
    selector: (state: NodeDataFromNode<N>) => Out,
  ): WaitForState<Out, RetVal> {
    const waitForState = useWaitForState<RetVal, NodesContext>(Store.useStore());
    return useCallback(
      (callback) =>
        waitForState((state, setReturnValue) => {
          if (state.readiness !== NodesReadiness.Ready) {
            return false;
          }

          const nodeData = node ? state.nodeData[node.id] : undefined;
          if (!nodeData) {
            return false;
          }
          return callback(selector(nodeData as NodeDataFromNode<N>), setReturnValue);
        }),
      [waitForState, node, selector],
    );
  },
  useNodeDataSelector: () => {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Store.useDelayedSelector({
      mode: 'innerSelector',
      makeArgs: (state) => [((node) => selectNodeData(node, state, insideGenerator)) satisfies NodePicker],
    });
  },
  useLaxNodeDataSelector: () => {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Store.useLaxDelayedSelector({
      mode: 'innerSelector',
      makeArgs: (state) => [((node) => selectNodeData(node, state, insideGenerator)) satisfies NodePicker],
    });
  },
  useNodeDataSelectorProps: () => {
    const insideGenerator = GeneratorInternal.useIsInsideGenerator();
    return Store.useDelayedSelectorProps({
      mode: 'innerSelector',
      makeArgs: (state) => [((node) => selectNodeData(node, state, insideGenerator)) satisfies NodePicker],
    });
  },
  useTypeFromId: (id: string) => Store.useSelector((s) => s.nodeData[id]?.layout.type),
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

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';
import { produce } from 'immer';
import { createStore } from 'zustand';
import type { UnionToIntersection } from 'utility-types';
import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
import { AttachmentsStorePlugin } from 'src/features/attachments/AttachmentsStorePlugin';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { HiddenComponentsProvider } from 'src/features/form/dynamics/HiddenComponentsProvider';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useLaxLayoutSettings, useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { OptionsStorePlugin } from 'src/features/options/OptionsStorePlugin';
import { ExpressionValidation } from 'src/features/validation/expressionValidation/ExpressionValidation';
import { LoadingBlockerWaitForValidation, ProvideWaitForValidation } from 'src/features/validation/validationContext';
import { ValidationStorePlugin } from 'src/features/validation/ValidationStorePlugin';
import { SelectorStrictness, useDelayedSelector } from 'src/hooks/delayedSelectors';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { GeneratorDebug, generatorLog } from 'src/utils/layout/generator/debug';
import {
  GeneratorStages,
  GeneratorStagesProvider,
  NODES_TICK_TIMEOUT,
  useGetAwaitingCommits,
} from 'src/utils/layout/generator/GeneratorStages';
import { LayoutSetGenerator } from 'src/utils/layout/generator/LayoutSetGenerator';
import { GeneratorValidationProvider } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { RepeatingChildrenStorePlugin } from 'src/utils/layout/plugins/RepeatingChildrenStorePlugin';
import { TraversalTask } from 'src/utils/layout/useNodeTraversal';
import type { AttachmentsStorePluginConfig } from 'src/features/attachments/AttachmentsStorePlugin';
import type { OptionsStorePluginConfig } from 'src/features/options/OptionsStorePlugin';
import type { ValidationStorePluginConfig } from 'src/features/validation/ValidationStorePlugin';
import type { DSReturn, InnerSelectorMode, OnlyReRenderWhen } from 'src/hooks/delayedSelectors';
import type { WaitForState } from 'src/hooks/useWaitForState';
import type { CompTypes } from 'src/layout/layout';
import type { ChildClaim } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { RepeatingChildrenStorePluginConfig } from 'src/utils/layout/plugins/RepeatingChildrenStorePlugin';
import type { GeneratorErrors, NodeData, NodeDataFromNode } from 'src/utils/layout/types';

export interface PagesData {
  type: 'pages';
  pages: {
    [key: string]: PageData;
  };
}

export interface HiddenState {
  hiddenByRules: boolean;
  hiddenByExpression: boolean;
  hiddenByTracks: boolean;
}

export interface PageData {
  type: 'page';
  pageKey: string;
  hidden: HiddenState;
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
  claim: ChildClaim;
  rowIndex: number | undefined;
}

export interface SetNodePropRequest<T extends CompTypes, K extends keyof NodeData<T>> {
  node: LayoutNode<T>;
  prop: K;
  value: NodeData<T>[K];
  partial?: boolean;
}

export interface SetPagePropRequest<K extends keyof PageData> {
  pageKey: string;
  prop: K;
  value: PageData[K];
}

export enum NodesReadiness {
  Ready = 'READY',
  NotReady = 'NOT READY',
  WaitingUntilLastSaveHasProcessed = 'WAIT FOR SAVE',
}

export type NodesContext = {
  readiness: NodesReadiness;

  // Counter to prevent re-rendering of NodeTraversal when expressions/options/validations change
  addRemoveCounter: number;

  hasErrors: boolean;
  nodes: LayoutPages | undefined;
  pagesData: PagesData;
  nodeData: { [key: string]: NodeData };
  hiddenViaRules: { [key: string]: true | undefined };
  hiddenViaRulesRan: boolean;

  setNodes: (nodes: LayoutPages) => void;
  addNodes: (requests: AddNodeRequest[]) => void;
  removeNode: (node: LayoutNode, claim: ChildClaim, rowIndex: number | undefined) => void;
  setNodeProps: (requests: SetNodePropRequest<CompTypes, keyof NodeData>[]) => void;
  addError: (error: string, node: LayoutPage | LayoutNode) => void;
  markHiddenViaRule: (hiddenFields: { [nodeId: string]: true }) => void;

  addPage: (pageKey: string) => void;
  setPageProps: <K extends keyof PageData>(requests: SetPagePropRequest<K>[]) => void;
  markReady: (readiness?: NodesReadiness) => void;

  reset: () => void;

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

export type NodesContextStore = StoreApi<NodesContext>;
export function createNodesDataStore() {
  const defaultState = {
    readiness: NodesReadiness.NotReady,
    addRemoveCounter: 0,
    hasErrors: false,
    nodes: undefined,
    pagesData: {
      type: 'pages' as const,
      pages: {},
    },
    nodeData: {},
    hiddenViaRules: {},
    hiddenViaRulesRan: false,
  };

  return createStore<NodesContext>((set) => ({
    ...defaultState,

    markHiddenViaRule: (newState) =>
      set((state) => {
        if (deepEqual(state.hiddenViaRules, newState)) {
          return { hiddenViaRulesRan: true };
        }

        return { hiddenViaRules: newState, hiddenViaRulesRan: true };
      }),

    setNodes: (nodes) => set({ nodes }),
    addNodes: (requests) =>
      set((state) => {
        const nodeData = { ...state.nodeData };
        for (const { node, targetState, claim, rowIndex } of requests) {
          if (nodeData[node.id]) {
            const errorMsg =
              `Cannot add node '${node.id}', it already exists. ` +
              `Maybe the layout-set has one or more components with duplicate IDs?`;
            window.logError(errorMsg);
            throw new Error(errorMsg);
          }

          nodeData[node.id] = targetState;

          if (node.parent instanceof BaseLayoutNode) {
            const additionalParentState = node.parent.def.addChild(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeData[node.parent.id] as any,
              node,
              claim,
              rowIndex,
            );
            nodeData[node.parent.id] = {
              ...nodeData[node.parent.id],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(additionalParentState as any),
            };
          }

          node.page._addChild(node);
        }
        return { nodeData, readiness: NodesReadiness.NotReady, addRemoveCounter: state.addRemoveCounter + 1 };
      }),
    removeNode: (node, claim, rowIndex) =>
      set((state) => {
        const nodeData = { ...state.nodeData };
        if (!nodeData[node.id]) {
          return {};
        }

        if (node.parent instanceof BaseLayoutNode && nodeData[node.parent.id]) {
          const additionalParentState = node.parent.def.removeChild(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeData[node.parent.id] as any,
            node,
            claim,
            rowIndex,
          );
          nodeData[node.parent.id] = {
            ...nodeData[node.parent.id],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(additionalParentState as any),
          };
        }

        delete nodeData[node.id];
        node.page._removeChild(node);
        return { nodeData, readiness: NodesReadiness.NotReady, addRemoveCounter: state.addRemoveCounter + 1 };
      }),
    setNodeProps: (requests) =>
      set((state) => {
        let changes = false;
        const nodeData = { ...state.nodeData };
        for (const { node, prop, value, partial } of requests) {
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
          state.readiness = NodesReadiness.NotReady;

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
            hidden: {
              hiddenByRules: false,
              hiddenByExpression: false,
              hiddenByTracks: false,
            },
            errors: undefined,
          };
          state.readiness = NodesReadiness.NotReady;
          state.addRemoveCounter += 1;
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
    markReady: (readiness = NodesReadiness.Ready) => set(() => ({ readiness })),

    reset: () => set(() => ({ ...structuredClone(defaultState) })),

    waitForCommits: undefined,
    setWaitForCommits: (waitForCommits) => set(() => ({ waitForCommits })),

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
    const isGenerating = GeneratorStages.useIsGenerating();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useSelector(selector) : WhenReady.useSelector(selector);
  },
  useMemoSelector: <T,>(selector: (state: NodesContext) => T): T | undefined => {
    const isGenerating = GeneratorStages.useIsGenerating();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useMemoSelector(selector) : WhenReady.useMemoSelector(selector);
  },
  useLaxSelector: <T,>(selector: (state: NodesContext) => T): T | typeof ContextNotProvided => {
    const isGenerating = GeneratorStages.useIsGenerating();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useLaxSelector(selector) : WhenReady.useLaxSelector(selector);
  },
  useLaxMemoSelector: <T,>(selector: (state: NodesContext) => T): T | typeof ContextNotProvided => {
    const isGenerating = GeneratorStages.useIsGenerating();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return isGenerating ? Store.useLaxMemoSelector(selector) : WhenReady.useLaxMemoSelector(selector);
  },
};

export const NodesProvider = ({ children }: React.PropsWithChildren) => {
  const layouts = useLayouts();
  const lastLayouts = useRef(layouts);
  const counter = useRef(0);

  if (lastLayouts.current !== layouts) {
    // Resets the entire node state when the layout changes (either via Studio, our own DevTools, or Cypress tests).
    // We could just re-render Store.Provider here by passing counter as a key to it, but that would create an entirely
    // new store, which would break the reference in ProvideWaitForValidation (which would take a few render cycles to
    // properly update, which may break those already awaiting validation).
    counter.current += 1;
    lastLayouts.current = layouts;
  }

  return (
    <Store.Provider>
      <ResettableStore counter={counter.current}>{children}</ResettableStore>
    </Store.Provider>
  );
};

function ResettableStore({ counter, children }: PropsWithChildren<{ counter: number }>) {
  const markReady = Store.useSelector((s) => s.markReady);
  const reset = Store.useSelector((s) => s.reset);
  const [lastSeenCounter, setLastSeenCounter] = useState(0);

  useEffect(() => {
    if (counter > 0) {
      reset();
      setLastSeenCounter(counter);
    }
  }, [counter, reset]);

  if (counter !== lastSeenCounter) {
    return <NodesLoader />;
  }

  return (
    <Fragment key={counter}>
      <GeneratorStagesProvider markReady={markReady}>
        <GeneratorValidationProvider>
          <LayoutSetGenerator />
        </GeneratorValidationProvider>
        <MarkAsReady />
      </GeneratorStagesProvider>
      {window.Cypress && <UpdateAttachmentsForCypress />}
      <BlockUntilAlmostReady>
        <HiddenComponentsProvider />
      </BlockUntilAlmostReady>
      <BlockUntilLoaded>
        <ProvideWaitForValidation />
        <ExpressionValidation />
        <LoadingBlockerWaitForValidation>{children}</LoadingBlockerWaitForValidation>
      </BlockUntilLoaded>
      <IndicateReadiness />
    </Fragment>
  );
}

function IndicateReadiness() {
  const [readiness, hiddenViaRulesRan] = Store.useSelector((s) => [s.readiness, s.hiddenViaRulesRan]);
  const ready = readiness === NodesReadiness.Ready && hiddenViaRulesRan;
  document.body.setAttribute('data-nodes-ready', ready.toString());

  useEffect(() => {
    document.body.setAttribute('data-nodes-ready', ready.toString());
    return () => {
      document.body.removeAttribute('data-nodes-ready');
    };
  }, [ready]);

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

function MarkAsReady() {
  return (
    <>
      <InnerMarkAsReady />
      <RegisterOnSaveFinished />
    </>
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
function InnerMarkAsReady() {
  const markReady = Store.useSelector((s) => s.markReady);
  const readiness = Store.useSelector((s) => s.readiness);
  const hiddenViaRulesRan = Store.useSelector((s) => s.hiddenViaRulesRan);
  const hasNodes = Store.useSelector((state) => !!state.nodes);
  const stagesFinished = GeneratorStages.useIsFinished();
  const hasUnsavedChanges = FD.useHasUnsavedChanges();

  // Even though the getAwaitingCommits() function works on refs in the GeneratorStages context, the effects of such
  // commits always changes the NodesContext. Thus our useSelector() re-runs and re-renders this components when
  // commits are done.
  const getAwaitingCommits = useGetAwaitingCommits();
  const waitingForCommits = Store.useSelector(() => getAwaitingCommits() > 0);

  const savingOk = readiness === NodesReadiness.WaitingUntilLastSaveHasProcessed ? !hasUnsavedChanges : true;
  const maybeReady = hasNodes && stagesFinished && savingOk && hiddenViaRulesRan;
  const shouldMarkAsReady = maybeReady && !waitingForCommits;
  const fallbackToInterval = maybeReady && !shouldMarkAsReady;

  useEffect(() => {
    if (shouldMarkAsReady) {
      generatorLog('logReadiness', 'Marking state as ready');
      markReady();
    }
  }, [shouldMarkAsReady, markReady]);

  useEffect(() => {
    if (fallbackToInterval) {
      // Commits can happen where state is not really changed, and in those cases our useSelector() won't run, and we
      // won't notice that we could mark the state as ready again. For these cases we run intervals while the state
      // isn't ready.
      const runDuringInterval = () => {
        const awaiting = getAwaitingCommits();
        if (awaiting === 0) {
          generatorLog('logReadiness', 'Marking state as ready via interval fallback');
          markReady();
          clearInterval(interval);
        }
      };
      const interval = setInterval(runDuringInterval, NODES_TICK_TIMEOUT);
      runDuringInterval();
      return () => clearInterval(interval);
    }

    return () => undefined;
  }, [fallbackToInterval, getAwaitingCommits, markReady]);

  return null;
}

function RegisterOnSaveFinished() {
  const setOnSaveFinished = FD.useSetOnSaveFinished();
  const markReady = Store.useSelector((s) => s.markReady);

  useEffect(() => {
    setOnSaveFinished(() => {
      generatorLog('logReadiness', 'Marking state as not ready because of recent form data save');
      markReady(NodesReadiness.WaitingUntilLastSaveHasProcessed);
    });
  }, [setOnSaveFinished, markReady]);

  return null;
}

function BlockUntilAlmostReady({ children }: PropsWithChildren) {
  const ready = Store.useSelector((state) => state.nodes !== undefined);
  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

function BlockUntilLoaded({ children }: PropsWithChildren) {
  const hasBeenReady = useRef(false);
  const ready = Store.useSelector((state) => {
    if (state.nodes && state.readiness === NodesReadiness.Ready) {
      hasBeenReady.current = true;
      return true;
    }
    return hasBeenReady.current;
  });

  if (!ready) {
    return <NodesLoader />;
  }

  return <>{children}</>;
}

function NodesLoader() {
  return <Loader reason='nodes' />;
}

type MaybeNode = string | undefined | null | LayoutNode;
type RetValFromNode<T extends MaybeNode> = T extends LayoutNode
  ? T
  : T extends undefined
    ? undefined
    : T extends null
      ? null
      : T extends string
        ? LayoutNode
        : never;

/**
 * Use the expression context. This will return a LayoutPages object containing the full tree of resolved
 * nodes (meaning, instances of layout components in a tree, with their expressions evaluated and resolved to
 * scalar values).
 *
 * Usually, if you're looking for a specific component/node, useResolvedNode() is better.
 */
export function useNode<T extends string | undefined | LayoutNode>(id: T): RetValFromNode<T> {
  const node = Store.useSelector((state) => {
    if (!id) {
      return undefined;
    }

    if (!state?.nodes) {
      return undefined;
    }

    if (id instanceof BaseLayoutNode) {
      return id;
    }

    return state.nodes.findById(new TraversalTask(state, state.nodes, undefined, undefined), id);
  });
  return node as RetValFromNode<T>;
}

export const useGetPage = (pageId: string | undefined) =>
  Store.useSelector((state) => {
    if (!pageId) {
      return undefined;
    }

    if (!state?.nodes) {
      return undefined;
    }
    return state.nodes.findLayout(new TraversalTask(state, state.nodes, undefined, undefined), pageId);
  });

export const useNodes = () => WhenReady.useSelector((s) => s.nodes!);
export const useNodesWhenNotReady = () => Store.useSelector((s) => s.nodes);
export const useNodesLax = () => WhenReady.useLaxSelector((s) => s.nodes);

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

function isHiddenHere(hidden: HiddenState, options?: IsHiddenOptions) {
  const { respectDevTools = true, respectTracks = false, forcedVisibleByDevTools = false } = options ?? {};
  if (forcedVisibleByDevTools && respectDevTools) {
    return true;
  }

  return hidden.hiddenByRules || hidden.hiddenByExpression || (respectTracks && hidden.hiddenByTracks);
}

function isHiddenPage(state: NodesContext, page: LayoutPage | string | undefined, options?: IsHiddenOptions) {
  if (!page) {
    return true;
  }

  const pageKey = typeof page === 'string' ? page : page.pageKey;
  const hiddenState = state.pagesData.pages[pageKey]?.hidden;
  if (!hiddenState) {
    return true;
  }

  return isHiddenHere(hiddenState, options);
}

function isHidden(
  state: NodesContext,
  node: LayoutNode | LayoutPage | undefined,
  options?: IsHiddenOptions,
): boolean | undefined {
  if (!node) {
    return undefined;
  }

  const hiddenState =
    node instanceof LayoutPage ? state.pagesData.pages[node.pageKey]?.hidden : state.nodeData[node.id]?.hidden;

  if (!hiddenState) {
    return undefined;
  }

  const hiddenHere = isHiddenHere(hiddenState, options);
  if (hiddenHere) {
    return true;
  }

  if (node instanceof BaseLayoutNode) {
    const parent = node.parent;
    if (parent instanceof BaseLayoutNode && 'isChildHidden' in parent.def && state.nodeData[parent.id]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childHidden = parent.def.isChildHidden(state.nodeData[parent.id] as any, node);
      if (childHidden) {
        return true;
      }
    }

    return isHidden(state, parent, options);
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
    const forcedVisibleByDevTools = Hidden.useIsForcedVisibleByDevTools();
    return WhenReady.useMemoSelector((s) => isHidden(s, node, makeOptions(forcedVisibleByDevTools, options)));
  },
  useIsHiddenPage(page: LayoutPage | string | undefined, options?: AccessibleIsHiddenOptions) {
    const forcedVisibleByDevTools = Hidden.useIsForcedVisibleByDevTools();
    return WhenReady.useMemoSelector((s) => isHiddenPage(s, page, makeOptions(forcedVisibleByDevTools, options)));
  },
  useIsHiddenPageSelector() {
    const forcedVisibleByDevTools = Hidden.useIsForcedVisibleByDevTools();
    return Store.useDelayedSelector({
      mode: 'simple',
      selector: (page: LayoutPage | string) => (state) =>
        isHiddenPage(state, page, makeOptions(forcedVisibleByDevTools)),
    });
  },
  useHiddenPages(): Set<string> {
    const forcedVisibleByDevTools = Hidden.useIsForcedVisibleByDevTools();
    const hiddenPages = WhenReady.useLaxMemoSelector((s) =>
      Object.keys(s.pagesData.pages).filter((key) =>
        isHiddenHere(s.pagesData.pages[key].hidden, makeOptions(forcedVisibleByDevTools)),
      ),
    );
    return useMemo(() => new Set(hiddenPages === ContextNotProvided ? [] : hiddenPages), [hiddenPages]);
  },
  useIsHiddenSelector() {
    const forcedVisibleByDevTools = Hidden.useIsForcedVisibleByDevTools();
    return Store.useDelayedSelector({
      mode: 'simple',
      selector: (node: LayoutNode | LayoutPage, options?: IsHiddenOptions) => (state) =>
        isHidden(state, node, makeOptions(forcedVisibleByDevTools, options)),
    });
  },
  useLaxIsHiddenSelector() {
    const forcedVisibleByDevTools = Hidden.useIsForcedVisibleByDevTools();
    return Store.useLaxDelayedSelector({
      mode: 'simple',
      selector: (node: LayoutNode | LayoutPage, options?: IsHiddenOptions) => (state) =>
        isHidden(state, node, makeOptions(forcedVisibleByDevTools, options)),
    });
  },

  /**
   * The next ones are primarily for internal use:
   */
  useIsHiddenViaRules: (node: LayoutNode) =>
    Store.useSelector((s) => s.hiddenViaRules[node.id] ?? s.hiddenViaRules[node.baseId] ?? false),
  useIsForcedVisibleByDevTools() {
    const devToolsIsOpen = useDevToolsStore((state) => state.isOpen);
    const devToolsHiddenComponents = useDevToolsStore((state) => state.hiddenComponents);

    return devToolsIsOpen && devToolsHiddenComponents !== 'hide';
  },
  useIsPageHiddenViaTracks(pageKey: string) {
    const currentView = useCurrentView();
    const maybeLayoutSettings = useLaxLayoutSettings();
    const orderWithHidden = maybeLayoutSettings === ContextNotProvided ? [] : maybeLayoutSettings.pages.order;
    const isHiddenByTracks = !orderWithHidden.includes(pageKey);
    const layoutSettings = useLayoutSettings();

    if (pageKey === currentView) {
      // If this is the current view, then it's never hidden. This avoids settings fields as hidden when
      // code caused this to be the current view even if it's not in the common order.
      return false;
    }

    if (layoutSettings.pages.pdfLayoutName && pageKey === layoutSettings.pages.pdfLayoutName) {
      // If this is the pdf layout, then it's never hidden.
      return false;
    }

    return isHiddenByTracks;
  },
};

export type NodeDataSelector = ReturnType<typeof NodesInternal.useNodeDataSelector>;
export type LaxNodeDataSelector = ReturnType<typeof NodesInternal.useLaxNodeDataSelector>;

export type NodePicker = <N extends LayoutNode | undefined = LayoutNode | undefined>(node: N) => NodePickerReturns<N>;
type NodePickerReturns<N extends LayoutNode | undefined> = NodeDataFromNode<N> | undefined;

function selectNodeData<N extends LayoutNode | undefined>(node: N, state: NodesContext): NodePickerReturns<N> {
  return (node ? state.nodeData[node.id] : undefined) as NodePickerReturns<N>;
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
  useIsReady() {
    const isReady = Store.useLaxSelector((s) => s.readiness === NodesReadiness.Ready && s.hiddenViaRulesRan);
    if (isReady === ContextNotProvided) {
      return true;
    }
    return isReady;
  },
  useWaitUntilReady() {
    const store = Store.useLaxStore();
    const waitForState = useWaitForState<undefined, NodesContext | typeof ContextNotProvided>(store);
    const waitForCommits = Store.useSelector((s) => s.waitForCommits);
    return useCallback(async () => {
      await waitForState((state) =>
        state === ContextNotProvided ? true : state.readiness === NodesReadiness.Ready && state.hiddenViaRulesRan,
      );
      if (waitForCommits) {
        await waitForCommits();
      }
    }, [waitForState, waitForCommits]);
  },

  useFullErrorList() {
    return Store.useSelector((s) => {
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

  useNodeData<N extends LayoutNode | undefined, Out>(node: N, selector: (state: NodeDataFromNode<N>) => Out) {
    return Conditionally.useMemoSelector((s) =>
      node && s.nodeData[node.id] ? selector(s.nodeData[node.id] as NodeDataFromNode<N>) : undefined,
    ) as N extends undefined ? Out | undefined : Out;
  },
  useNodeDataRef<N extends LayoutNode | undefined, Out>(
    node: N,
    selector: (state: NodeDataFromNode<N>) => Out,
  ): React.MutableRefObject<N extends undefined ? Out | undefined : Out> {
    return Store.useSelectorAsRef(
      (s) => (node && s.nodeData[node.id] ? selector(s.nodeData[node.id] as NodeDataFromNode<N>) : undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
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
  useNodeDataSelector: () =>
    Store.useDelayedSelector({
      mode: 'innerSelector',
      makeArgs: (state) => [((node) => selectNodeData(node, state)) satisfies NodePicker],
    }),
  useLaxNodeDataSelector: () =>
    Store.useLaxDelayedSelector({
      mode: 'innerSelector',
      makeArgs: (state) => [((node) => selectNodeData(node, state)) satisfies NodePicker],
    }),
  useTypeFromId: (id: string) => Store.useSelector((s) => s.nodeData[id]?.layout.type),
  useIsAdded: (node: LayoutNode | LayoutPage) =>
    Store.useSelector((s) => {
      if (node instanceof LayoutPage) {
        return s.pagesData.pages[node.pageKey] !== undefined;
      }
      return s.nodeData[node.id] !== undefined;
    }),
  useHasErrors: () => Store.useSelector((s) => s.hasErrors),

  useStore: () => Store.useStore(),
  useSetNodeProps: () => Store.useSelector((s) => s.setNodeProps),
  useSetNodes: () => Store.useSelector((s) => s.setNodes),
  useAddPage: () => Store.useSelector((s) => s.addPage),
  useSetPageProps: () => Store.useSelector((s) => s.setPageProps),
  useAddNodes: () => Store.useSelector((s) => s.addNodes),
  useRemoveNode: () => Store.useSelector((s) => s.removeNode),
  useAddError: () => Store.useSelector((s) => s.addError),
  useMarkHiddenViaRule: () => Store.useSelector((s) => s.markHiddenViaRule),
  useSetWaitForCommits: () => Store.useSelector((s) => s.setWaitForCommits),

  ...(Object.values(StorePlugins)
    .map((plugin) => plugin.extraHooks(Store))
    .reduce((acc, val) => ({ ...acc, ...val }), {}) as ExtraHooks),
};

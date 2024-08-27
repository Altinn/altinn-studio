import React, { useCallback, useEffect, useId, useRef } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { GeneratorDebug, generatorLog } from 'src/utils/layout/generator/debug';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { NodesInternal, NodesReadiness } from 'src/utils/layout/NodesContext';
import type { AddNodeRequest, SetNodePropRequest, SetPagePropRequest } from 'src/utils/layout/NodesContext';
import type { SetRowExtrasRequest } from 'src/utils/layout/plugins/RepeatingChildrenStorePlugin';

export const StageAddNodes = Symbol('AddNodes');
export const StageMarkHidden = Symbol('MarkHidden');
export const StageFetchOptions = Symbol('OptionsFetched');
export const StageEvaluateExpressions = Symbol('EvaluateExpressions');
export const StageFormValidation = Symbol('FormValidation');
export const StageFinished = Symbol('Finished');

const List = [
  StageAddNodes,
  StageMarkHidden,
  StageFetchOptions,
  StageEvaluateExpressions,
  StageFormValidation,
  StageFinished,
] as const;
const SecondToLast = List[List.length - 2];

type StageList = typeof List;
type Stage = StageList[number];

export const NODES_TICK_TIMEOUT = 10;

type OnStageDone = () => void;
interface Context {
  currentStage: Stage;
  registry: React.MutableRefObject<Registry>;
  tick: undefined | (() => void);
  setTick: (tick: () => void) => void;
  nextStage: () => void;
  runNum: number;
  restart: (reason: 'hook' | 'component') => void;
  toCommit: {
    addNodes: AddNodeRequest[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNodeProps: SetNodePropRequest<any, any>[];
    setRowExtras: SetRowExtrasRequest[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPageProps: SetPagePropRequest<any>[];
  };
}

type Registry = {
  restartAfter: boolean;
  stages: {
    [stage in Stage]: {
      finished: boolean;
      onDone: OnStageDone[];
      components: {
        [id: string]: {
          initialRunNum: number;
          finished: boolean;
          conditions: string;
        };
      };
      hooks: {
        [id: string]: {
          initialRunNum: number;
          finished: boolean;
        };
      };
    };
  };
};

interface CreateStoreProps {
  registry: MutableRefObject<Registry>;
  markReady: (ready?: NodesReadiness) => void;
}

function performanceMark(action: 'start' | 'end', runNum: number, stage?: Stage) {
  if (typeof window.performance?.mark !== 'function') {
    return;
  }

  const _stage = stage ? stage.description : 'total';
  window.performance.mark(`GeneratorStages:${_stage}:${action}:${runNum}`);
}

function formatDuration(runNum: number, stage?: Stage) {
  if (typeof window.performance?.getEntriesByName !== 'function') {
    return '?ms';
  }

  const _stage = stage ? stage.description : 'total';
  const start = window.performance.getEntriesByName(`GeneratorStages:${_stage}:start:${runNum}`)[0];
  const end = window.performance.getEntriesByName(`GeneratorStages:${_stage}:end:${runNum}`)[0];
  if (!start || !end) {
    return '?ms';
  }
  return `${(end.startTime - start.startTime).toFixed(0)}ms`;
}

const { Provider, useSelector, useSelectorAsRef, useMemoSelector, useHasProvider } = createZustandContext({
  name: 'GeneratorStages',
  required: true,
  initialCreateStore: ({ registry, markReady }: CreateStoreProps) => {
    generatorLog('logStages', `Initial node generation started`);
    performanceMark('start', 1, List[0]);
    performanceMark('start', 1);

    return createStore<Context>((set) => ({
      currentStage: List[0],
      registry,
      tick: undefined,
      setTick: (tick) => {
        set({ tick });
      },
      nextStage: () => {
        set((state) => {
          const currentIndex = List.indexOf(state.currentStage);
          let nextStage = List[currentIndex + 1];
          let runNum = state.runNum;
          if (nextStage) {
            performanceMark('end', state.runNum, state.currentStage);
            performanceMark('start', state.runNum, nextStage);

            const hooks = Object.values(registry.current.stages[state.currentStage].hooks).filter(
              (hook) => hook.initialRunNum === state.runNum && hook.finished,
            ).length;
            const components = Object.values(registry.current.stages[state.currentStage].components).filter(
              (component) => component.initialRunNum === state.runNum && component.finished,
            ).length;

            generatorLog(
              'logStages',
              `Stage finished: ${state.currentStage.description}`,
              `(hooks: ${hooks},`,
              `conditionals: ${components},`,
              `duration ${formatDuration(state.runNum, state.currentStage)})`,
            );

            if (nextStage === StageFinished && registry.current.restartAfter) {
              registry.current.restartAfter = false;

              // This has the advantage of skipping the 'finished' stage, and thus not reaching the nodes 'ready' state
              // before the next run finishes. This may happen if you end up trying to generate more nodes before the
              // last run finished properly, and thus a new cycle will start right afterwards.
              performanceMark('end', state.runNum);
              generatorLog(
                'logStages',
                `Node generation finished, but restarts instantly, total duration`,
                formatDuration(state.runNum),
              );
              nextStage = List[0];
              runNum = state.runNum + 1;
              performanceMark('start', runNum, nextStage);
              performanceMark('start', runNum);
            } else if (nextStage === StageFinished) {
              performanceMark('end', state.runNum);
              generatorLog('logStages', `Node generation finished, total duration`, formatDuration(state.runNum));
            }
            return { currentStage: nextStage, runNum };
          }
          return state;
        });
      },
      runNum: 1,
      restart: (reason) => {
        set((state) => {
          if (state.currentStage === List[List.length - 1]) {
            const runNum = state.runNum + 1;
            generatorLog('logStages', `New`, reason, `registered, restarting stages (run ${runNum})`);
            performanceMark('start', runNum, List[0]);
            performanceMark('start', runNum);

            for (const stage of List) {
              registry.current.stages[stage].finished = false;
            }

            generatorLog('logReadiness', 'Marking state as not ready when starting new run');
            markReady(NodesReadiness.NotReady);
            return { currentStage: List[0], runNum };
          }

          return {};
        });
      },
      toCommit: {
        // These should be considered as 'refs'. Meaning, we won't set them via an action, we'll always just manipulate
        // the arrays references directly.
        addNodes: [],
        setNodeProps: [],
        setRowExtras: [],
        setPageProps: [],
      },
    }));
  },
});

function registryStats(stage: Stage, registry: Registry, runNum: number) {
  const s = registry.stages[stage];
  const numHooks = Object.values(s.hooks).filter((h) => h.initialRunNum === runNum).length;
  const doneHooks = Object.values(s.hooks).filter((h) => h.finished && h.initialRunNum === runNum).length;
  const numComponents = Object.values(s.components).filter((c) => c.initialRunNum === runNum).length;
  const doneComponents = Object.values(s.components).filter((c) => c.finished && c.initialRunNum === runNum).length;

  return { numHooks, doneHooks, numComponents, doneComponents };
}

function isStageDone(stage: Stage, registry: Registry, runNum: number) {
  const { numHooks, doneHooks, numComponents, doneComponents } = registryStats(stage, registry, runNum);
  return numHooks === doneHooks && numComponents === doneComponents;
}

function shouldCommit(stage: Stage, registry: Registry, runNum: number) {
  const { numHooks, doneHooks } = registryStats(stage, registry, runNum);
  return numHooks === doneHooks;
}

export function useGetAwaitingCommits() {
  const toCommit = useSelector((state) => state.toCommit);

  return useCallback(
    () =>
      toCommit.addNodes.length +
      toCommit.setNodeProps.length +
      toCommit.setRowExtras.length +
      toCommit.setPageProps.length,
    [toCommit],
  );
}

interface StagesProps {
  markReady: (ready?: NodesReadiness) => void;
}

/**
 * Generator stages provide useEffect() hooks that are called at different stages of the node generation process. This
 * is useful for separating logic into different stages that rely on earlier stages being completed before the
 * stage can begin. When processing the node hierarchy, it is important that all nodes are added to the storage before
 * we can start evaluating expressions, because expressions can reference other nodes.
 *
 * Wrapping hooks this way ensures that the order of execution of the hooks is guaranteed.
 */
export function GeneratorStagesProvider({ children, markReady }: PropsWithChildren<StagesProps>) {
  const registry = React.useRef<Registry>({
    restartAfter: false,
    stages: Object.fromEntries(
      List.map((s) => [
        s as Stage,
        {
          finished: false,
          onDone: [],
          hooks: {},
          components: {},
        } satisfies Registry['stages'][Stage],
      ]),
    ),
  } as Registry);

  document.body.setAttribute('data-commits-pending', 'false');
  useEffect(
    () => () => {
      document.body.removeAttribute('data-commits-pending');
    },
    [],
  );

  return (
    <Provider
      registry={registry}
      markReady={markReady}
    >
      <SetTickFunc />
      {GeneratorDebug.logStages && <LogSlowStages />}
      <WhenTickIsSet>
        <CatchEmptyStages />
        {children}
      </WhenTickIsSet>
      <SetWaitForCommits />
    </Provider>
  );
}

function useCommit() {
  const addNodes = NodesInternal.useAddNodes();
  const setNodeProps = NodesInternal.useSetNodeProps();
  const setPageProps = NodesInternal.useSetPageProps();
  const setRowExtras = NodesInternal.useSetRowExtras();
  const toCommit = useSelector((state) => state.toCommit);

  return useCallback(() => {
    if (toCommit.addNodes.length) {
      generatorLog('logCommits', 'Committing', toCommit.addNodes.length, 'addNodes requests');
      addNodes(toCommit.addNodes);
      toCommit.addNodes.length = 0; // This truncates the array, but keeps the reference
      updateCommitsPendingInBody(toCommit);
      return true;
    }

    let changes = false;
    if (toCommit.setNodeProps.length) {
      generatorLog('logCommits', 'Committing', toCommit.setNodeProps.length, 'setNodeProps requests:', () => {
        const counts = {};
        for (const { prop } of toCommit.setNodeProps) {
          counts[prop] = (counts[prop] || 0) + 1;
        }
        return Object.entries(counts)
          .map(([prop, count]) => `${count}x ${prop}`)
          .join(', ');
      });
      setNodeProps(toCommit.setNodeProps);
      toCommit.setNodeProps.length = 0;
      changes = true;
    }

    if (toCommit.setRowExtras.length) {
      generatorLog('logCommits', 'Committing', toCommit.setRowExtras.length, 'setRowExtras requests');
      setRowExtras(toCommit.setRowExtras);
      toCommit.setRowExtras.length = 0;
      changes = true;
    }

    if (toCommit.setPageProps.length) {
      generatorLog('logCommits', 'Committing', toCommit.setPageProps.length, 'setPageProps requests');
      setPageProps(toCommit.setPageProps);
      toCommit.setPageProps.length = 0;
      changes = true;
    }

    updateCommitsPendingInBody(toCommit);
    return changes;
  }, [addNodes, setNodeProps, setRowExtras, toCommit, setPageProps]);
}

function SetWaitForCommits() {
  const setWaitForCommits = NodesInternal.useSetWaitForCommits();
  const toCommit = useSelector((s) => s.toCommit);

  const waitForCommits = useCallback(async () => {
    let didWait = false;
    while (Object.values(toCommit).some((arr) => arr.length > 0)) {
      await new Promise((resolve) => setTimeout(resolve, 4));
      didWait = true;
    }

    // If we did wait, wait some more (until the commits have been stored)
    if (didWait) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }, [toCommit]);

  useEffect(() => {
    setWaitForCommits(waitForCommits);
  }, [setWaitForCommits, waitForCommits]);

  return null;
}

/**
 * When we're adding nodes, we could be calling setState() on each of the states we need to update, but this would
 * be very costly and scale badly with larger forms (layout sets). Instead, we collect all the changes we need to make
 * and then apply them all at once. The principle only works if we're calling these queue functions in useEffect
 * hooks from a stage, because we'll check to make sure all hooks registered in a render cycle have finished before
 * committing all the changes in one go.
 */
export const NodesStateQueue = {
  useAddNode() {
    const toCommit = useSelector((state) => state.toCommit);

    return useCallback(
      (request: AddNodeRequest) => {
        toCommit.addNodes.push(request);
        updateCommitsPendingInBody(toCommit);
      },
      [toCommit],
    );
  },
  useSetNodeProp() {
    const toCommit = useSelector((state) => state.toCommit);
    const maybeCommit = useCommitWhenFinished();

    return useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request: SetNodePropRequest<any, any>) => {
        toCommit.setNodeProps.push(request);
        updateCommitsPendingInBody(toCommit);
        maybeCommit();
      },
      [maybeCommit, toCommit],
    );
  },
  useSetRowExtras() {
    const toCommit = useSelector((state) => state.toCommit);
    const maybeCommit = useCommitWhenFinished();

    return useCallback(
      (request: SetRowExtrasRequest) => {
        toCommit.setRowExtras.push(request);
        updateCommitsPendingInBody(toCommit);
        maybeCommit();
      },
      [maybeCommit, toCommit],
    );
  },
  useSetPageProp() {
    const toCommit = useSelector((state) => state.toCommit);
    const maybeCommit = useCommitWhenFinished();

    return useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request: SetPagePropRequest<any>) => {
        toCommit.setPageProps.push(request);
        updateCommitsPendingInBody(toCommit);
        maybeCommit();
      },
      [maybeCommit, toCommit],
    );
  },
};

/**
 * Some of the queue hooks need to commit changes even when all stages are in a finished state. Even though we're not
 * in a generation cycle, we still need to commit changes like expressions updating, validations, etc. To speed this
 * up (setTimeout is slow, at least when debugging), we'll set a timeout once if this selector find out the generator
 * has finished.
 */
let commitTimeout: ReturnType<typeof setTimeout> | null = null;
function useCommitWhenFinished() {
  const commit = useCommit();
  const stateRef = useSelectorAsRef((s) => s);

  return useCallback(() => {
    if (stateRef.current.currentStage === StageFinished && !commitTimeout) {
      commitTimeout = setTimeout(() => {
        commit();
        commitTimeout = null;
      }, 4);
    }
  }, [stateRef, commit]);
}

function updateCommitsPendingInBody(toCommit: Context['toCommit']) {
  const anyPendingCommits = Object.values(toCommit).some((arr) => arr.length > 0);
  if (anyPendingCommits) {
    document.body.setAttribute('data-commits-pending', 'true');
  } else {
    setTimeout(() => {
      document.body.setAttribute('data-commits-pending', 'false');
    }, NODES_TICK_TIMEOUT + 1);
  }
}

function SetTickFunc() {
  const currentStageRef = useSelectorAsRef((state) => state.currentStage);
  const currentRunRef = useSelectorAsRef((state) => state.runNum);
  const goToNextStage = useSelector((state) => state.nextStage);
  const setTick = useSelector((state) => state.setTick);
  const registry = useSelector((state) => state.registry);
  const commit = useCommit();

  const tickTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickFunc = useCallback(() => {
    tickTimeout.current = null;

    const stage = currentStageRef.current;
    const runNum = currentRunRef.current;
    if (!isStageDone(stage, registry.current, runNum)) {
      if (shouldCommit(stage, registry.current, runNum)) {
        commit();
      }
      return;
    }
    const currentIndex = List.indexOf(stage);
    const nextStage = List[currentIndex + 1];
    if (!nextStage) {
      return;
    }

    if (commit()) {
      setTimeout(tickFunc, 4);
      return;
    }

    registry.current.stages[stage].onDone.forEach((cb) => cb());
    registry.current.stages[stage].onDone = [];
    registry.current.stages[stage].finished = true;

    goToNextStage();
  }, [currentStageRef, currentRunRef, registry, commit, goToNextStage]);

  const tick = React.useCallback(() => {
    if (tickTimeout.current) {
      clearTimeout(tickTimeout.current);
    }
    tickTimeout.current = setTimeout(tickFunc, NODES_TICK_TIMEOUT);
  }, [tickFunc]);

  useEffect(() => {
    setTick(tick);
    return () => {
      if (tickTimeout.current) {
        clearTimeout(tickTimeout.current);
      }
    };
  }, [setTick, tick]);

  return null;
}

function CatchEmptyStages() {
  const currentStage = useSelector((state) => state.currentStage);
  const currentRun = useSelector((state) => state.runNum);
  const registry = useSelector((state) => state.registry);
  const tick = useSelector((state) => state.tick);

  useEffect(() => {
    // If, after a render we don't have any registered hooks or callbacks for the current stage, we should just proceed
    // to the next stage (using the tick function).
    setTimeout(() => {
      const numHooks = Object.values(registry.current.stages[currentStage].hooks).filter(
        (h) => h.initialRunNum === currentRun,
      ).length;
      const numComponents = Object.values(registry.current.stages[currentStage].components).filter(
        (c) => c.initialRunNum === currentRun,
      ).length;
      const shouldFinish = isStageDone(currentStage, registry.current, currentRun);
      if ((numHooks === 0 && numComponents === 0) || shouldFinish) {
        tick && tick();
      }
    }, NODES_TICK_TIMEOUT * 2);
  }, [currentRun, currentStage, registry, tick]);

  return null;
}

function LogSlowStages() {
  const currentStageRef = useSelectorAsRef((state) => state.currentStage);
  const currentRun = useSelector((state) => state.runNum);
  const registry = useSelector((state) => state.registry);
  useEffect(() => {
    let lastReportedStage: Stage | undefined;
    const interval = setInterval(() => {
      const current = currentStageRef.current;
      const last = List[List.length - 1];
      if (current === last) {
        clearInterval(interval);
        return;
      }
      if (lastReportedStage !== current) {
        lastReportedStage = current;
        return;
      }
      lastReportedStage = current;

      const { numHooks, doneHooks, numComponents, doneComponents } = registryStats(
        current,
        registry.current,
        currentRun,
      );
      generatorLog(
        'logStages',
        `Still on stage ${current.description}`,
        `(${doneHooks}/${numHooks} hooks finished, ${doneComponents}/${numComponents} conditionals finished)`,
      );

      // If we're stuck on the same stage for a while, log a list of hooks that are still pending
      const stage = registry.current.stages[current];
      const pendingHooks = Object.entries(stage.hooks)
        .filter(([, hook]) => !hook.finished && hook.initialRunNum === currentRun)
        .map(([id]) => id)
        .join('\n - ');
      generatorLog('logStages', `Pending hooks:\n - ${pendingHooks}`);

      const pendingComponents = Object.entries(stage.components)
        .filter(([, component]) => !component.finished && component.initialRunNum === currentRun)
        .map(([id, component]) => `${id} (conditions: ${component.conditions})`)
        .join('\n - ');
      generatorLog('logStages', `Pending components:\n - ${pendingComponents}`);
    }, 2500);
  }, [currentRun, currentStageRef, registry]);

  return null;
}

function WhenTickIsSet({ children }: PropsWithChildren) {
  const tick = useSelector((state) => state.tick);
  if (!tick) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Utility collection for hooks you can use to attach to different stages. The hooks will only run when the generator
 * has reached the stage they are attached to (or, if the node generator has finished, they will run immediately).
 */
const Finished = makeHooks(StageFinished);
export const GeneratorStages = {
  AddNodes: makeHooks(StageAddNodes),
  MarkHidden: makeHooks(StageMarkHidden),
  FetchOptions: makeHooks(StageFetchOptions),
  EvaluateExpressions: makeHooks(StageEvaluateExpressions),
  FormValidation: makeHooks(StageFormValidation),
  useIsFinished() {
    return Finished.useIsCurrent();
  },
  useIsGenerating() {
    return useHasProvider();
  },
};

/**
 * This is purposefully not reactive, i.e. when the generator run count increases, this stays the same as when the
 * hook/component was first rendered. This is to make sure that conditionals in existing nodes are not affected
 * by new nodes being added (because existing nodes should be treated as if the generator stages have already
 * finished).
 */
function useInitialRunNum() {
  const runNumberRef = useSelectorAsRef((state) => state.runNum);

  const ref = useRef(runNumberRef.current);
  return ref.current;
}

function useShouldRenderOrRun(stage: Stage, isNew: boolean, restartReason: 'hook' | 'component') {
  const initialRun = useInitialRunNum();

  const [shouldRenderOrRun, shouldRestart] = useMemoSelector((state) => {
    if (isNew && state.currentStage === StageFinished) {
      return [false, true];
    }
    if (!isNew && state.runNum > initialRun) {
      return [true, false];
    }

    return [isStageAtLeast(state, stage), false];
  });

  // When new hooks and components are registered and the stages have finished (typically when a new
  // row in a repeating group is added, and thus new nodes are being generated), restart the stages.
  const restart = useSelector((state) => state.restart);
  useEffect(() => {
    if (shouldRestart) {
      restart(restartReason);
    }
  }, [restart, restartReason, shouldRestart]);

  return shouldRenderOrRun;
}

function isStageAtLeast(state: Context, stage: Stage) {
  const currentIndex = List.indexOf(state.currentStage);
  const targetIndex = List.indexOf(stage);
  return currentIndex >= targetIndex;
}

function useIsStageAtLeast(stage: Stage) {
  return useSelector((state) => isStageAtLeast(state, stage));
}

interface ConditionProps {
  stage: Stage;
  mustBeAdded?: 'parent' | 'all';
}

/**
 * A component you can wrap around your own components to make sure they only run when the generator has reached a
 * certain stage, and optionally only if a certain condition is met.
 */
export function GeneratorCondition({ stage, mustBeAdded, children }: PropsWithChildren<ConditionProps>) {
  const id = useUniqueId();
  const registry = useSelector((state) => state.registry);
  const initialRunNum = useInitialRunNum();
  const registryRef = useRef<Registry['stages'][Stage]['components'][string]>({
    finished: false,
    initialRunNum,
    conditions: mustBeAdded ? `${mustBeAdded} must be added` : 'none',
  });

  let isNew = false;
  if (!registry.current.stages[stage].components[id]) {
    registry.current.stages[stage].components[id] = registryRef.current;
    isNew = true;
  }

  // Unregister the component when it is removed
  useEffect(
    () => () => {
      delete registry.current.stages[stage].components[id];
    },
    [id, registry, stage],
  );

  const shouldRender = useShouldRenderOrRun(stage, isNew, 'component');
  if (!shouldRender) {
    return null;
  }

  const props: WhenProps = { id, stage, registryRef };

  if (mustBeAdded === 'parent') {
    return <WhenParentAdded {...props}>{children}</WhenParentAdded>;
  }

  if (mustBeAdded === 'all') {
    return <WhenAllAdded {...props}>{children}</WhenAllAdded>;
  }

  if (mustBeAdded === undefined) {
    return <Now {...props}>{children}</Now>;
  }

  throw new Error(`Invalid mustBeAdded value: ${mustBeAdded}`);
}

interface WhenProps extends PropsWithChildren {
  id: string;
  stage: Stage;
  registryRef: MutableRefObject<Registry['stages'][Stage]['components'][string]>;
}

function WhenParentAdded({ id, stage, registryRef, children }: WhenProps) {
  const parent = GeneratorInternal.useParent();
  const ready = NodesInternal.useIsAdded(parent);
  useMarkFinished(id, stage, ready);
  registryRef.current.conditions =
    parent instanceof BaseLayoutNode ? `node ${parent.id} must be added` : `page ${parent.pageKey} must be added`;

  return ready ? <>{children}</> : null;
}

function WhenAllAdded({ id, stage, registryRef, children }: WhenProps) {
  const parent = GeneratorInternal.useParent();
  const allAdded = GeneratorStages.AddNodes.useIsDone();
  const parentAdded = NodesInternal.useIsAdded(parent);
  const ready = allAdded && parentAdded;
  useMarkFinished(id, stage, ready);
  registryRef.current.conditions =
    parent instanceof BaseLayoutNode
      ? `node ${parent.id} and all others are added`
      : `page ${parent.pageKey} and all others are added`;

  return ready ? <>{children}</> : null;
}

function Now({ id, stage, children }: WhenProps) {
  useMarkFinished(id, stage, true);
  return <>{children}</>;
}

function useMarkFinished(id: string, stage: Stage, ready: boolean) {
  const tick = useSelector((state) => state.tick!);
  const registry = useSelector((state) => state.registry);
  useEffect(() => {
    if (ready) {
      registry.current.stages[stage].components[id].finished = true;
      tick();
    }
  }, [id, registry, stage, ready, tick]);
}

function useUniqueId() {
  return useId();
}

function makeHooks(stage: Stage) {
  function useEffect(effect: (markFinished: () => void) => void | (() => void), deps?: React.DependencyList) {
    const uniqueId = useUniqueId();
    const registry = useSelector((state) => state.registry);
    const tick = useSelector((state) => state.tick!);
    const runNum = useInitialRunNum();

    let isNew = false;
    const reg = registry.current.stages[stage];
    if (!reg.hooks[uniqueId]) {
      reg.hooks[uniqueId] = { finished: false, initialRunNum: runNum };
      isNew = true;
    }

    if (isNew && reg.finished && !registry.current.stages[SecondToLast].finished) {
      throw new Error(
        'Cannot add new hooks after the AddNodes stage has finished. ' +
          'Make sure this is wrapped in GeneratorRunProvider.',
      );
    }

    const shouldRun = useShouldRenderOrRun(stage, isNew, 'hook');

    // Unregister the hook when it is removed
    React.useEffect(() => {
      const reg = registry.current.stages[stage];
      return () => {
        delete reg.hooks[uniqueId];
      };
    }, [uniqueId, registry]);

    // Run the actual hook
    React.useEffect(() => {
      if (shouldRun) {
        const markFinished = () => {
          registry.current.stages[stage].hooks[uniqueId].finished = true;
        };
        const returnValue = effect(markFinished);
        tick();
        return returnValue;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldRun, ...(deps || [])]);
  }

  return {
    useConditionalEffect(effect: () => boolean, deps?: React.DependencyList) {
      useEffect((markFinished) => {
        if (effect()) {
          markFinished();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
    },
    useEffect(effect: React.EffectCallback, deps?: React.DependencyList) {
      useEffect((markFinished) => {
        const out = effect();
        markFinished();
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
    },
    useIsDone() {
      return useIsStageAtLeast(stage);
    },
    useIsCurrent() {
      return useMemoSelector((state) => state.currentStage === stage);
    },
  };
}

const canProceedWhenIn = [StageFinished, StageAddNodes];
function useIsReadyToRun() {
  const targetRunNumberRef = useSelectorAsRef((state) => {
    // New nodes are only allowed to be added after the last run has finished, or when the AddNodes
    // stage is in progress. All others will have to wait for the next run.
    if (canProceedWhenIn.includes(state.currentStage)) {
      return state.runNum;
    }
    return state.runNum + 1;
  });

  // Just like useInitialRunNum, this is intentionally not reactive
  const myRunNum = useRef(targetRunNumberRef.current);

  return useSelector((state) => {
    if (canProceedWhenIn.includes(state.currentStage)) {
      return true;
    }

    return myRunNum.current <= state.runNum;
  });
}

/**
 * Wrapping your components in this will block them from being able to render
 * until the node generator is idle again
 */
export function GeneratorRunProvider({ children }: PropsWithChildren) {
  const ready = useIsReadyToRun();
  const registry = useSelector((state) => state.registry);

  if (!ready) {
    // Something has stopped here and is not proceeding before the next run. By setting this we notify the
    // tick function to proceed to the next run immediately when the current one finishes.
    registry.current.restartAfter = true;
    return null;
  }

  return children;
}

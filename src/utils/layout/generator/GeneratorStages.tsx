import React, { useCallback, useEffect, useId, useRef } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { SetWaitForCommits, useCommit } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorDebug, generatorLog } from 'src/utils/layout/generator/debug';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { NodesInternal, NodesReadiness, NodesStore } from 'src/utils/layout/NodesContext';
import type { ValidationsProcessedLast } from 'src/features/validation';
import type { RegistryCommitQueues } from 'src/utils/layout/generator/CommitQueue';
import type { NodesContext } from 'src/utils/layout/NodesContext';

export const StageAddNodes = Symbol('AddNodes');
export const StageMarkHidden = Symbol('MarkHidden');
export const StageFetchOptions = Symbol('OptionsFetched');
export const StageFormValidation = Symbol('FormValidation');
export const StageFinished = Symbol('Finished');

const List = [StageAddNodes, StageMarkHidden, StageFetchOptions, StageFormValidation, StageFinished] as const;

type StageList = typeof List;
type Stage = StageList[number];

export const NODES_TICK_TIMEOUT = 10;

type OnStageDone = () => void;
export interface GeneratorStagesContext {
  currentStage: Stage;
  tick: undefined | (() => void);
  setTick: (tick: () => void) => void;
  nextStage: () => void;
  runNum: number;
  restart: (reason: 'hook' | 'component') => void;
}

/**
 * The registry is a collection of state kept in a ref, and is used to keep track of the progress in the node generator.
 * Consider it an 'inner workings' state store that is frequently updated. Since it is stored in a ref, it cannot be
 * reactive.
 *
 */
export type Registry = {
  restartAfter: boolean;
  stages: RegistryStages;
  toCommit: RegistryCommitQueues;
  toCommitCount: number;
  commitTimeout: ReturnType<typeof setTimeout> | null;
  validationsProcessed: {
    [nodeId: string]: ValidationsProcessedLast;
  };
};

/**
 * Each component is registered with a unique ID, and the registry keeps track of whether the component
 * has finished its work for the current run.
 */
type RegistryStages = {
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
  };
};

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

export function createStagesStore(
  registry: MutableRefObject<Registry>,
  set: (setter: (ctx: NodesContext) => Partial<NodesContext>) => void,
): GeneratorStagesContext {
  generatorLog('logStages', `Initial node generation started`);
  performanceMark('start', 1, List[0]);
  performanceMark('start', 1);

  return {
    currentStage: List[0],
    tick: undefined,
    setTick: (tick) => {
      set((state) => {
        const stages = { ...state.stages };
        stages.tick = tick;
        return { stages };
      });
    },
    nextStage: () => {
      set((state) => {
        const currentIndex = List.indexOf(state.stages.currentStage);
        let nextStage = List[currentIndex + 1];
        let runNum = state.stages.runNum;
        if (nextStage) {
          performanceMark('end', state.stages.runNum, state.stages.currentStage);
          performanceMark('start', state.stages.runNum, nextStage);

          const components = Object.values(registry.current.stages[state.stages.currentStage].components).filter(
            (component) => component.initialRunNum === state.stages.runNum && component.finished,
          ).length;

          generatorLog(
            'logStages',
            `Stage finished: ${state.stages.currentStage.description}`,
            `(conditionals: ${components},`,
            `duration ${formatDuration(state.stages.runNum, state.stages.currentStage)})`,
          );

          if (nextStage === StageFinished && registry.current.restartAfter) {
            registry.current.restartAfter = false;

            // This has the advantage of skipping the 'finished' stage, and thus not reaching the nodes 'ready' state
            // before the next run finishes. This may happen if you end up trying to generate more nodes before the
            // last run finished properly, and thus a new cycle will start right afterwards.
            performanceMark('end', state.stages.runNum);
            generatorLog(
              'logStages',
              `Node generation finished, but restarts instantly, total duration`,
              formatDuration(state.stages.runNum),
            );
            nextStage = List[0];
            runNum = state.stages.runNum + 1;
            performanceMark('start', runNum, nextStage);
            performanceMark('start', runNum);
          } else if (nextStage === StageFinished) {
            performanceMark('end', state.stages.runNum);
            generatorLog('logStages', `Node generation finished, total duration`, formatDuration(state.stages.runNum));
          }

          const stages = { ...state.stages };
          stages.currentStage = nextStage;
          stages.runNum = runNum;
          return { stages };
        }
        return {};
      });
    },
    runNum: 1,
    restart: (reason) => {
      set((state) => {
        if (state.stages.currentStage === List[List.length - 1]) {
          const runNum = state.stages.runNum + 1;
          generatorLog('logStages', `New`, reason, `registered, restarting stages (run ${runNum})`);
          performanceMark('start', runNum, List[0]);
          performanceMark('start', runNum);

          for (const stage of List) {
            registry.current.stages[stage].finished = false;
          }

          state.markReady('new run from stages', NodesReadiness.NotReady);
          const stages = { ...state.stages };
          stages.currentStage = List[0];
          stages.runNum = runNum;
          return { stages };
        }

        return {};
      });
    },
  };
}

function registryStats(stage: Stage, registry: Registry, runNum: number) {
  const s = registry.stages[stage];
  const total = Object.values(s.components).filter((c) => c.initialRunNum === runNum).length;
  const done = Object.values(s.components).filter((c) => c.finished && c.initialRunNum === runNum).length;

  return { total, done };
}

function isStageDone(stage: Stage, registry: Registry, runNum: number) {
  const { total, done } = registryStats(stage, registry, runNum);
  return total === done;
}

/**
 * Creates a new registry for the generator. Instead of using this hook directly, you'll probably want to
 * get it from:
 * @see GeneratorInternal.useRegistry
 */
export function useRegistry() {
  document.body.setAttribute('data-commits-pending', 'false');
  useEffect(
    () => () => {
      document.body.removeAttribute('data-commits-pending');
    },
    [],
  );

  return useRef<Registry>({
    restartAfter: false,
    stages: Object.fromEntries(
      List.map((s) => [
        s as Stage,
        {
          finished: false,
          onDone: [],
          components: {},
        } satisfies Registry['stages'][Stage],
      ]),
    ) as RegistryStages,
    toCommitCount: 0,
    toCommit: {
      addNodes: [],
      removeNodes: [],
      setNodeProps: [],
      setPageProps: [],
    },
    commitTimeout: null,
    validationsProcessed: {},
  });
}

export function GeneratorStagesEffects() {
  return (
    <>
      <SetTickFunc />
      {GeneratorDebug.logStages && <LogSlowStages />}
      <WhenTickIsSet>
        <CatchEmptyStages />
      </WhenTickIsSet>
      <SetWaitForCommits />
    </>
  );
}

function SetTickFunc() {
  const currentStageRef = NodesStore.useSelectorAsRef((state) => state.stages.currentStage);
  const currentRunRef = NodesStore.useSelectorAsRef((state) => state.stages.runNum);
  const goToNextStage = NodesStore.useSelector((state) => state.stages.nextStage);
  const setTick = NodesStore.useSelector((state) => state.stages.setTick);
  const registry = GeneratorInternal.useRegistry();
  const commit = useCommit();

  const tickTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickFunc = useCallback(() => {
    tickTimeout.current = null;

    const stage = currentStageRef.current;
    const runNum = currentRunRef.current;
    if (!isStageDone(stage, registry.current, runNum)) {
      commit();
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
  const currentStage = NodesStore.useSelector((state) => state.stages.currentStage);
  const currentRun = NodesStore.useSelector((state) => state.stages.runNum);
  const registry = GeneratorInternal.useRegistry();
  const tick = NodesStore.useSelector((state) => state.stages.tick);

  useEffect(() => {
    // If, after a render we don't have any registered hooks or callbacks for the current stage, we should just proceed
    // to the next stage (using the tick function).
    setTimeout(() => {
      const numComponents = Object.values(registry.current.stages[currentStage].components).filter(
        (c) => c.initialRunNum === currentRun,
      ).length;
      const shouldFinish = isStageDone(currentStage, registry.current, currentRun);
      if (numComponents === 0 || shouldFinish) {
        tick && tick();
      }
    }, NODES_TICK_TIMEOUT * 2);
  }, [currentRun, currentStage, registry, tick]);

  return null;
}

function LogSlowStages() {
  const currentStageRef = NodesStore.useSelectorAsRef((state) => state.stages.currentStage);
  const currentRun = NodesStore.useSelector((state) => state.stages.runNum);
  const registry = GeneratorInternal.useRegistry();
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

      const { total, done } = registryStats(current, registry.current, currentRun);
      generatorLog('logStages', `Still on stage ${current.description}`, `(${done}/${total} conditionals finished)`);

      // If we're stuck on the same stage for a while, log a list of conditionals that are still pending
      const stage = registry.current.stages[current];
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
  const tick = NodesStore.useSelector((state) => state.stages.tick);
  if (!tick) {
    return null;
  }

  return children;
}

/**
 * Utility collection for hooks you can use to attach to different stages. The hooks will only run when the generator
 * has reached the stage they are attached to (or, if the node generator has finished, they will run immediately).
 */
export const GeneratorStages = {
  useIsDoneAddingNodes: () => useIsStageAtLeast(StageAddNodes),
  useIsFinished: () => NodesStore.useMemoSelector((state) => state.stages.currentStage === StageFinished),
};

/**
 * This is purposefully not reactive, i.e. when the generator run count increases, this stays the same as when the
 * hook/component was first rendered. This is to make sure that conditionals in existing nodes are not affected
 * by new nodes being added (because existing nodes should be treated as if the generator stages have already
 * finished).
 */
function useInitialRunNum() {
  const ref = useRef(NodesStore.useStaticSelector((state) => state.stages.runNum));
  return ref.current;
}

function useShouldRenderOrRun(stage: Stage, isNew: boolean, restartReason: 'hook' | 'component') {
  const initialRun = useInitialRunNum();

  const [shouldRenderOrRun, shouldRestart] = NodesStore.useShallowSelector((state) => {
    if (isNew && state.stages.currentStage === StageFinished) {
      return [false, true];
    }
    if (!isNew && state.stages.runNum > initialRun) {
      return [true, false];
    }

    return [isStageAtLeast(state.stages, stage), false];
  });

  // When new hooks and components are registered and the stages have finished (typically when a new
  // row in a repeating group is added, and thus new nodes are being generated), restart the stages.
  const store = NodesStore.useStore();
  useEffect(() => {
    const state = store.getState();

    // It seems that calling restart() here, even when it just falls back to setting an empty object, will
    // cause a deep comparison and trash performance when you have many components in a form. Checking
    // the stage beforehand will prevent this.
    const isOnLastStage = state.stages.currentStage === List[List.length - 1];

    if (shouldRestart && isOnLastStage) {
      state.stages.restart(restartReason);
    }
  }, [restartReason, shouldRestart, store]);

  return shouldRenderOrRun;
}

function isStageAtLeast(state: GeneratorStagesContext, stage: Stage) {
  const currentIndex = List.indexOf(state.currentStage);
  const targetIndex = List.indexOf(stage);
  return currentIndex >= targetIndex;
}

function useIsStageAtLeast(stage: Stage) {
  return NodesStore.useSelector((state) => isStageAtLeast(state.stages, stage));
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
  const registry = GeneratorInternal.useRegistry();
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
    parent instanceof LayoutNode ? `node ${parent.id} must be added` : `page ${parent?.pageKey} must be added`;

  return ready ? children : null;
}

function WhenAllAdded({ id, stage, registryRef, children }: WhenProps) {
  const parent = GeneratorInternal.useParent();
  const allAdded = GeneratorStages.useIsDoneAddingNodes();
  const parentAdded = NodesInternal.useIsAdded(parent);
  const ready = allAdded && parentAdded;
  useMarkFinished(id, stage, ready);
  registryRef.current.conditions =
    parent instanceof LayoutNode
      ? `node ${parent.id} and all others are added`
      : `page ${parent?.pageKey} and all others are added`;

  return ready ? children : null;
}

function Now({ id, stage, children }: WhenProps) {
  useMarkFinished(id, stage, true);
  return children;
}

function useMarkFinished(id: string, stage: Stage, ready: boolean) {
  const tick = NodesStore.useSelector((state) => state.stages.tick!);
  const registry = GeneratorInternal.useRegistry();
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

const canProceedWhenIn = [StageFinished, StageAddNodes];
function useIsReadyToRun() {
  const targetRunNumberRef = NodesStore.useSelectorAsRef((state) => {
    // New nodes are only allowed to be added after the last run has finished, or when the AddNodes
    // stage is in progress. All others will have to wait for the next run.
    if (canProceedWhenIn.includes(state.stages.currentStage)) {
      return state.stages.runNum;
    }
    return state.stages.runNum + 1;
  });

  // Just like useInitialRunNum, this is intentionally not reactive
  const myRunNum = useRef(targetRunNumberRef.current);

  return NodesStore.useSelector((state) => {
    if (canProceedWhenIn.includes(state.stages.currentStage)) {
      return true;
    }

    return myRunNum.current <= state.stages.runNum;
  });
}

/**
 * Wrapping your components in this will block them from being able to render
 * until the node generator is idle again
 */
export function GeneratorRunProvider({ children }: PropsWithChildren) {
  const ready = useIsReadyToRun();
  const registry = GeneratorInternal.useRegistry();

  if (!ready) {
    // Something has stopped here and is not proceeding before the next run. By setting this we notify the
    // tick function to proceed to the next run immediately when the current one finishes.
    registry.current.restartAfter = true;
    return null;
  }

  return children;
}

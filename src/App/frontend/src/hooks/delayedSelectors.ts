import { useRef, useSyncExternalStore } from 'react';

import deepEqual from 'fast-deep-equal';
import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { ShallowArrayMap } from 'src/core/structures/ShallowArrayMap';

type Selector<T, U> = (state: T) => U;
type SelectorMap<C extends DSConfig> = ShallowArrayMap<{
  fullSelector: Selector<TypeFromConf<C>, unknown>;
  value: unknown;
}>;

type TypeFromConf<C extends DSConfig> = C extends DSConfig<infer T> ? T : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModeFromConf<C extends DSConfig> = C extends DSConfig<any, infer M> ? M : never;

/**
 * A complex hook that returns a function you can use to select a value at some point in the future. If you never
 * select any values from the store, the store will not be subscribed to, and the component will not re-render when
 * the store changes. If you do select a value, the store will be subscribed to, and the component will only re-render
 * if the selected value(s) change when compared with the previous value.
 *
 * An important note when using this hook: The selector functions you pass must also be memoized (i.e. created with
 * useMemo or useCallback), or the component will fall back to re-rendering every time the store changes. This is
 * because the function itself will be recreated every time the component re-renders, and the function
 * will not be able to be used as a cache key.
 */
export function useDelayedSelector<C extends DSConfig>(props: DSProps<C>): DSReturn<C> {
  const state = useRef<SingleDelayedSelectorController<C>>(undefined);
  if (!state.current) {
    state.current = new SingleDelayedSelectorController(props);
  }

  // Check if any deps have changed
  state.current.checkDeps(props);

  return useSyncExternalStore(state.current.subscribe, state.current.getSnapshot);
}

export function useMultipleDelayedSelectors<P extends MultiDSProps>(...props: P): { [I in keyof P]: DSReturn<P[I]> } {
  const state = useRef<MultiDelayedSelectorController<P>>(undefined);
  if (!state.current) {
    state.current = new MultiDelayedSelectorController(props);
  }

  // Check if any deps have changed
  state.current.checkDeps(props);

  return useSyncExternalStore(state.current.subscribe, state.current.getSnapshot);
}

abstract class BaseDelayedSelector<C extends DSConfig> {
  private store: C['store'];
  private strictness: C['strictness'];
  private mode: C['mode'];
  private makeCacheKey: (args: unknown[]) => unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private equalityFn: (a: any, b: any) => boolean;
  private deps: unknown[] | undefined;

  protected selectorFunc = ((...args: unknown[]) => this.selector(...args)) as DSReturn<C>;
  private selectorsCalled: SelectorMap<C> | null = null;
  private unsubscribeMethod: (() => void) | null = null;

  constructor({
    store,
    strictness,
    mode,
    makeCacheKey = mode.mode === 'simple' ? defaultMakeCacheKey : defaultMakeCacheKeyForInnerSelector,
    equalityFn = deepEqual,
    deps,
  }: DSProps<C>) {
    this.store = store;
    this.strictness = strictness;
    this.mode = mode;
    this.makeCacheKey = makeCacheKey;
    this.equalityFn = equalityFn;
    this.deps = deps;
  }

  public checkDeps(newProps: DSProps<C>) {
    if (newProps.deps && !arrayShallowEqual(newProps.deps, this.deps)) {
      const {
        store,
        strictness,
        mode,
        makeCacheKey = mode.mode === 'simple' ? defaultMakeCacheKey : defaultMakeCacheKeyForInnerSelector,
        equalityFn = deepEqual,
        deps,
      } = newProps;

      this.store = store;
      this.strictness = strictness;
      this.mode = mode;
      this.makeCacheKey = makeCacheKey;
      this.equalityFn = equalityFn;
      this.deps = deps;

      // No need to trigger re-render if no selectors have been called
      if (this.selectorsCalled) {
        this.updateSelector();
      }
    }
  }

  protected abstract onUpdateSelector(): void;
  protected onCallSelector() {}

  private updateSelector() {
    this.selectorsCalled = null;
    this.unsubscribeFromStore();
    this.selectorFunc = ((...args: unknown[]) => this.selector(...args)) as DSReturn<C>;
    this.onUpdateSelector();
  }

  public unsubscribeFromStore() {
    if (this.unsubscribeMethod) {
      this.unsubscribeMethod();
      this.unsubscribeMethod = null;
    }
  }

  private subscribeToStore() {
    if (this.store === ContextNotProvided) {
      return null;
    }
    return this.store.subscribe((state) => {
      if (!this.selectorsCalled) {
        return;
      }

      // When the state changes, we run all the known selectors again to figure out if anything changed. If it
      // did change, we'll clear the list of selectors to force a re-render.
      const selectors = this.selectorsCalled.values();
      let changed = false;
      for (const { fullSelector, value } of selectors) {
        if (!this.equalityFn(value, fullSelector(state))) {
          changed = true;
          break;
        }
      }
      if (changed) {
        this.updateSelector();
      }
    });
  }

  private selector(...args: unknown[]) {
    if (this.store === ContextNotProvided) {
      if (this.strictness === SelectorStrictness.throwWhenNotProvided) {
        throw new Error('useDelayedSelector: store not provided');
      }
      return ContextNotProvided;
    }

    this.onCallSelector();

    const cacheKey = this.makeCacheKey(args);
    const prev = this.selectorsCalled?.get(cacheKey);
    if (prev) {
      return prev.value;
    }

    // We don't need to initialize the arraymap before checking for the previous value,
    // since we know it would not exist if we just created it.
    if (!this.selectorsCalled) {
      this.selectorsCalled = new ShallowArrayMap();
    }
    if (!this.unsubscribeMethod) {
      this.unsubscribeMethod = this.subscribeToStore();
    }

    let fullSelector: Selector<TypeFromConf<C>, unknown>;

    if (this.mode.mode === 'simple') {
      const { selector } = this.mode as SimpleArgMode;
      fullSelector = (state) => selector(...args)(state);
    } else if (this.mode.mode === 'innerSelector') {
      const { makeArgs } = this.mode as InnerSelectorMode;
      if (typeof args[0] !== 'function' || !Array.isArray(args[1]) || args.length !== 2) {
        throw new Error('useDelayedSelector: innerSelector must be a function');
      }
      fullSelector = (state) => {
        const innerArgs = makeArgs(state);
        const innerSelector = args[0] as (...args: typeof innerArgs) => unknown;
        return innerSelector(...innerArgs);
      };
    } else {
      throw new Error('useDelayedSelector: invalid mode');
    }

    const value = fullSelector(this.store.getState());
    this.selectorsCalled.set(cacheKey, { fullSelector, value });
    return value;
  }
}

class SingleDelayedSelectorController<C extends DSConfig> extends BaseDelayedSelector<C> {
  // Subscription does not happen synchronously, but as an effect, meaning that there is a window of time
  // where selectors could be used (and updated) before we have the ability to trigger a re-render.
  // See: https://github.com/facebook/react/blob/92c0f5f85fed42024b17bf6595291f9f5d6e8734/packages/react-reconciler/src/ReactFiberHooks.js#L1715-L1716
  private triggerRender: (() => void) | null = null;
  private shouldTriggerOnSubscribe = false;

  public getSnapshot = () => this.selectorFunc;
  public subscribe = (callback: () => void) => {
    this.triggerRender = callback;
    if (this.shouldTriggerOnSubscribe) {
      this.triggerRender();
      this.shouldTriggerOnSubscribe = false;
    }
    return () => this.unsubscribeFromStore();
  };

  protected onUpdateSelector(): void {
    if (this.triggerRender) {
      this.triggerRender();
    } else {
      this.shouldTriggerOnSubscribe = true;
    }
  }
}

class MultiDelayedSelector<C extends DSConfig> extends BaseDelayedSelector<C> {
  private readonly onChange: () => void;

  constructor(props: DSProps<C>, onChange: () => void) {
    super(props);
    this.onChange = onChange;
  }

  public getSelectorFunc() {
    return this.selectorFunc;
  }

  protected onUpdateSelector(): void {
    this.onChange();
  }
}

class MultiDelayedSelectorController<P extends MultiDSProps> {
  // Subscription does not happen synchronously, but as an effect, meaning that there is a window of time
  // where selectors could be used (and updated) before we have the ability to trigger a re-render.
  // See: https://github.com/facebook/react/blob/92c0f5f85fed42024b17bf6595291f9f5d6e8734/packages/react-reconciler/src/ReactFiberHooks.js#L1715-L1716
  private triggerRender: (() => void) | null = null;
  private shouldTriggerOnSubscribe = false;

  private controllers: MultiDelayedSelector<DSConfig>[] = [];
  private selectorFuncs: DSReturn<DSConfig>[] = [];

  constructor(props: P) {
    for (let i = 0; i < props.length; i++) {
      const MDS = new MultiDelayedSelector(props[i], () => this.onUpdateSelector(i));
      this.controllers.push(MDS);
      this.selectorFuncs.push(MDS.getSelectorFunc());
    }
  }

  public getSnapshot = () => this.selectorFuncs as { [I in keyof P]: DSReturn<P[I]> };

  public subscribe = (callback: () => void) => {
    this.triggerRender = callback;
    if (this.shouldTriggerOnSubscribe) {
      this.triggerRender();
      this.shouldTriggerOnSubscribe = false;
    }
    return () => this.controllers.forEach((c) => c.unsubscribeFromStore());
  };

  public checkDeps(newProps: P) {
    for (let i = 0; i < newProps.length; i++) {
      this.controllers[i].checkDeps(newProps[i]);
    }
  }

  private onUpdateSelector(index: number): void {
    this.selectorFuncs[index] = this.controllers[index].getSelectorFunc();
    this.selectorFuncs = [...this.selectorFuncs];
    if (this.triggerRender) {
      this.triggerRender();
    } else {
      this.shouldTriggerOnSubscribe = true;
    }
  }
}

function arrayShallowEqual(a: unknown[], b?: unknown[]) {
  if (a.length !== b?.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function defaultMakeCacheKeyForInnerSelector(args: unknown[]): unknown[] {
  if (args.length === 2 && typeof args[0] === 'function' && Array.isArray(args[1])) {
    return [args[0].toString().trim(), ...args[1]];
  }

  throw new Error('defaultMakeCacheKeyForInnerSelector: invalid arguments, use simple mode instead');
}

function defaultMakeCacheKey(args: unknown[]): unknown[] {
  // Make sure we don't allow inner selectors here, they need to use another mode:
  if (args.length === 2 && typeof args[0] === 'function' && Array.isArray(args[1])) {
    throw new Error('defaultMakeCacheKey: inner selectors are not allowed, use innerSelector mode instead');
  }

  return args;
}

export enum SelectorStrictness {
  throwWhenNotProvided = 'throwWhenNotProvided',
  returnWhenNotProvided = 'returnWhenNotProvided',
}

export interface SimpleArgMode<T = unknown, Args extends unknown[] = unknown[], RetVal = unknown> {
  mode: 'simple';
  selector: (...args: Args) => (state: T) => RetVal;
}

export interface InnerSelectorMode<T = unknown, Args extends unknown[] = unknown[]> {
  mode: 'innerSelector';
  makeArgs: (state: T) => Args;
}

export type DSMode<T> = SimpleArgMode<T> | InnerSelectorMode<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DSConfig<Type = any, Mode extends DSMode<Type> = any, Strictness extends SelectorStrictness = any> {
  store: StoreApi<Type> | typeof ContextNotProvided;
  mode: Mode;
  strictness: Strictness;
}

export interface DSProps<C extends DSConfig> {
  // A delayed selector must work with a Zustand store, or with ContextNotProvided if the store is not provided.
  store: C['store'];

  // Strictness changes how the delayed selector will work when ContextNotProvided is passed as the store.
  strictness: C['strictness'];

  // State selected from the delayed selector will be compared with this function. The default is deepEqual, meaning
  // that the state will be compared by value, not by reference.
  equalityFn?: (a: unknown, b: unknown) => boolean;

  // A function that will create a cache key for the delayed selector. This is used to cache the results of the
  // selector functions. Every argument to the selector function will be passed to this function.
  makeCacheKey?: (args: unknown[]) => unknown[];

  mode: C['mode'];

  // Any dependencies that should be passed to the delayed selector. This is used to determine when the entire
  // selector should be re-created.
  deps?: unknown[];
}

type MultiDSProps = DSProps<DSConfig>[];

export type DSPropsForSimpleSelector<
  Type,
  SimpleSelector extends (...args: unknown[]) => unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Strictness extends SelectorStrictness = any,
> = DSProps<DSConfig<Type, SimpleArgMode<Type, Parameters<SimpleSelector>, ReturnType<SimpleSelector>>, Strictness>>;

type DSPropsMatchingSimple<Selector extends (...args: unknown[]) => unknown> = DSProps<
  DSConfig<unknown, SimpleArgMode<unknown, Parameters<Selector>, ReturnType<Selector>>>
>;
type DSPropsMatchingInnerSelector<Args extends unknown[]> = DSProps<
  DSConfig<
    unknown,
    InnerSelectorMode<unknown, Args>,
    SelectorStrictness.returnWhenNotProvided | SelectorStrictness.throwWhenNotProvided
  >
>;

export type DSPropsMatching<Selector> = Selector extends (
  selector: (...args: infer Args) => unknown,
  deps: unknown[],
) => unknown
  ? () => DSPropsMatchingInnerSelector<Args>
  : Selector extends (...args: infer _Args) => unknown
    ? () => DSPropsMatchingSimple<Selector>
    : never;

export type DSReturn<C extends DSConfig> =
  ModeFromConf<C> extends SimpleArgMode
    ? (...args: Parameters<C['mode']['selector']>) => ReturnType<ReturnType<C['mode']['selector']>>
    : <U>(
        innerSelector: (...args: ReturnType<C['mode']['makeArgs']>) => U,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deps: any[],
      ) => C['strictness'] extends SelectorStrictness.returnWhenNotProvided ? U | typeof ContextNotProvided : U;

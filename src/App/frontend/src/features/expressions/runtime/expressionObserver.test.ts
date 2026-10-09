import dot from 'dot-object';
import { createStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { ExpressionObserver } from 'src/features/expressions/runtime/expressionObserver';
import { readExpressionDependencySource } from 'src/features/expressions/runtime/readExpressionDependencySource';
import type { ExpressionDependency } from 'src/features/expressions/runtime/expressionObserver';
import type { FormStoreState } from 'src/features/form/FormContext';

const first: ExpressionDependency = { type: 'formData', reference: { dataType: 'main', field: 'Nested.First' } };
const second: ExpressionDependency = { type: 'formData', reference: { dataType: 'main', field: 'Nested.Second' } };

function fixture(withSources = true) {
  const model = {
    currentData: { Nested: { First: 'immediate' } },
    debouncedCurrentData: { Nested: { First: 'before', Second: 'second' } },
    invalidCurrentData: {},
  };
  const store = createStore<FormStoreState>(
    () =>
      ({
        data: { models: { main: model } },
        bootstrap: { layoutLookups: {}, staticOptions: { choices: { options: [{ label: 'One', value: 'one' }] } } },
      }) as unknown as FormStoreState,
  );
  let activeStore: StoreApi<FormStoreState> | typeof ContextNotProvided = store;
  let externalValue = 'before';
  let queryCallback: (() => void) | undefined;
  const changed = vi.fn();
  const read = vi.fn((dependency: ExpressionDependency): unknown => {
    if (dependency.type === 'externalApi') {
      return externalValue;
    }
    if (dependency.type === 'currentLanguage') {
      return externalValue;
    }
    if (activeStore === ContextNotProvided) {
      return undefined;
    }
    const state = activeStore.getState();
    switch (dependency.type) {
      case 'formData':
        return dot.pick(
          dependency.reference.field,
          state.data.models[dependency.reference.dataType]?.debouncedCurrentData,
        );
      case 'layout':
        return state.bootstrap.layoutLookups;
      case 'options':
        return state.bootstrap.staticOptions[dependency.optionsId]?.options;
      default:
        return undefined;
    }
  });
  const source = vi.fn((dependency: ExpressionDependency) => readExpressionDependencySource(activeStore, dependency));
  const observer = new ExpressionObserver(changed, read, withSources ? source : undefined);
  const commit = (dependencies: ExpressionDependency[]) => {
    observer.beginCollect();
    observer.markEvaluated();
    dependencies.forEach((dependency) => observer.track(dependency));
    observer.commitCollect();
  };
  const subscribe = (immediate = false) =>
    observer.subscribe({
      owner: 'runtime',
      subscribeStore: (callback) => {
        const unsubscribe = store.subscribe(callback);
        if (immediate) {
          callback();
        }
        return unsubscribe;
      },
      subscribeQuery: (callback) => {
        queryCallback = callback;
        return () => {
          queryCallback = undefined;
        };
      },
    });
  const updateData = (data: object) =>
    store.setState((state) => ({
      ...state,
      data: {
        ...state.data,
        models: { ...state.data.models, main: { ...state.data.models.main, debouncedCurrentData: data } },
      },
    }));
  return {
    store,
    observer,
    changed,
    read,
    source,
    commit,
    subscribe,
    updateData,
    switchStore: (value: typeof activeStore) => {
      activeStore = value;
    },
    query: (value: string) => {
      externalValue = value;
      queryCallback?.();
    },
    setExternal: (value: string) => {
      externalValue = value;
    },
  };
}

describe('expression observer immutable source cache', () => {
  it('skips actual path reads for immediate and invalid data changes with unchanged debounced roots', () => {
    const f = fixture();
    f.commit([first]);
    const unsubscribe = f.subscribe();
    expect(f.read).toHaveBeenCalledTimes(1);
    for (const First of ['a', 'ab', 'abc']) {
      f.store.setState((state) => ({
        ...state,
        data: {
          ...state.data,
          models: {
            ...state.data.models,
            main: {
              ...state.data.models.main,
              currentData: { Nested: { First } },
              invalidCurrentData: { invalid: First },
            },
          },
        },
      }));
    }
    expect(f.read).toHaveBeenCalledTimes(1);
    expect(f.changed).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('updates after debounce and handles unchanged values before a subsequent change', async () => {
    const f = fixture();
    f.commit([first]);
    const unsubscribe = f.subscribe();
    f.updateData({ Nested: { First: 'before', Second: 'different' } });
    await Promise.resolve();
    expect(f.changed).not.toHaveBeenCalled();
    expect(f.read).toHaveBeenCalledTimes(2);
    f.updateData({ Nested: { First: 'after' } });
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(1);
    expect(f.read).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('compares against the committed value when an immediate subscription callback sees a newer snapshot', async () => {
    const f = fixture();
    f.commit([first]);
    f.updateData({ Nested: { First: 'newer' } });
    const unsubscribe = f.subscribe(true);
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(1);
    expect(f.read).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('prunes previous paths when the committed dependencies change', () => {
    const f = fixture();
    f.commit([first]);
    f.commit([second]);
    f.commit([first]);
    expect(f.read).toHaveBeenCalledTimes(3);
    f.commit([first]);
    expect(f.read).toHaveBeenCalledTimes(3);
  });

  it('keeps model and field identities distinct and observes removal and late model loading', async () => {
    const f = fixture();
    const other: ExpressionDependency = { type: 'formData', reference: { dataType: 'other', field: 'Nested.First' } };
    f.commit([first, second, other]);
    const unsubscribe = f.subscribe();
    f.store.setState((state) => ({
      ...state,
      data: { ...state.data, models: { ...state.data.models, other: state.data.models.main } },
    }));
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(1);
    f.store.setState((state) => ({ ...state, data: { ...state.data, models: {} } }));
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('invalidates layout and only the selected options array including missing values', async () => {
    const f = fixture();
    const layout: ExpressionDependency = { type: 'layout' };
    const options: ExpressionDependency = { type: 'options', optionsId: 'choices' };
    f.commit([layout, options]);
    const unsubscribe = f.subscribe();
    f.store.setState((state) => ({
      ...state,
      bootstrap: {
        ...state.bootstrap,
        staticOptions: { ...state.bootstrap.staticOptions, unrelated: { options: [] } },
      },
    }));
    expect(f.read).toHaveBeenCalledTimes(2);
    f.store.setState(
      (state) =>
        ({
          ...state,
          bootstrap: { ...state.bootstrap, layoutLookups: undefined, staticOptions: {} },
        }) as unknown as FormStoreState,
    );
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(1);
    expect(f.read).toHaveBeenCalledTimes(4);
    f.store.setState(
      (state) => ({ ...state, bootstrap: { ...state.bootstrap, layoutLookups: {} } }) as unknown as FormStoreState,
    );
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('rereads when the store changes even if it shares the same immutable source', () => {
    const f = fixture();
    f.commit([first]);
    const otherStore = createStore<FormStoreState>(() => f.store.getState());
    f.switchStore(otherStore);
    f.commit([first]);
    expect(f.read).toHaveBeenCalledTimes(2);
    f.switchStore(ContextNotProvided);
    f.commit([first]);
    expect(f.read).toHaveBeenCalledTimes(3);
    f.switchStore(f.store);
    f.commit([first]);
    expect(f.read).toHaveBeenCalledTimes(4);
  });

  it('does not publish partially read cache entries when a later dependency throws', () => {
    const f = fixture();
    f.commit([first, second]);
    f.updateData({ Nested: { First: 'after', Second: 'next' } });
    f.read
      .mockImplementationOnce(() => 'after')
      .mockImplementationOnce(() => {
        throw new Error('reader failed');
      });
    expect(() => f.commit([first, second])).toThrow('reader failed');
    expect(f.read).toHaveBeenCalledTimes(4);
    f.commit([first, second]);
    expect(f.read).toHaveBeenCalledTimes(6);
  });

  it('preserves fresh query and hook reads rather than applying source caching to them', async () => {
    const f = fixture();
    const external: ExpressionDependency = { type: 'externalApi', externalApiId: 'api' };
    const language: ExpressionDependency = { type: 'currentLanguage' };
    f.commit([external, language]);
    const unsubscribe = f.subscribe();
    f.query('after');
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(1);
    f.setExternal('later');
    f.observer.checkHookInputs();
    // Start a collection without evaluation, as in an unrelated React render.
    f.observer.beginCollect();
    f.observer.checkHookInputs();
    await Promise.resolve();
    expect(f.changed).toHaveBeenCalledTimes(2);
    expect(f.source).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('leaves custom observers without immutable source readers uncached', () => {
    const f = fixture(false);
    f.commit([first]);
    f.commit([first]);
    expect(f.read).toHaveBeenCalledTimes(2);
  });
});

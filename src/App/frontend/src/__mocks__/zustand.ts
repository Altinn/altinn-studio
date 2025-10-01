import { afterEach, jest } from '@jest/globals';
import { act } from '@testing-library/react';
import type * as zustand from 'zustand';

/**
 * @see https://docs.pmnd.rs/zustand/guides/testing#setting-up-zustand-for-testing
 */

const {
  create: actualCreate,
  createStore: actualCreateStore,
  useStore: actualUseStore,
} = jest.requireActual<typeof zustand>('zustand');

// A variable to hold reset functions for all stores declared in the app
export const storeResetFns = new Set<() => void>();

const createUncurried = <T>(stateCreator: zustand.StateCreator<T>) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// When creating a store, we get its initial state, create a reset function and add it in the set
// to support curried version of create
export const create = (<T>(stateCreator: zustand.StateCreator<T>) =>
  typeof stateCreator === 'function' ? createUncurried(stateCreator) : createUncurried) as typeof zustand.create;

const createStoreUncurried = <T>(stateCreator: zustand.StateCreator<T>) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// When creating a store, we get its initial state, create a reset function and add it in the set
// to support curried version of createStore
export const createStore = (<T>(stateCreator: zustand.StateCreator<T>) =>
  typeof stateCreator === 'function'
    ? createStoreUncurried(stateCreator)
    : createStoreUncurried) as typeof zustand.createStore;

// Simply export useStore from zustand
export const useStore = actualUseStore;

// Reset all stores after each test run
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});

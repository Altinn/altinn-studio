import React from 'react';
import { matchPath, useLocation, useNavigate as useNativeNavigate } from 'react-router-dom';
import type { MutableRefObject, PropsWithChildren } from 'react';
import type { NavigateOptions } from 'react-router-dom';

import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';

export type NavigationEffectCb = () => void;

interface PathParams {
  instanceOwnerPartyId?: string;
  instanceGuid?: string;
  taskId?: string;
  pageKey?: string;
  componentId?: string;
  dataElementId?: string;
  mainPageKey?: string;
}

export enum SearchParams {
  FocusComponentId = 'focusComponentId',
  ExitSubform = 'exitSubform',
  Validate = 'validate',
  Pdf = 'pdf',
}

interface Context {
  hash: string;
  updateHash: (hash: string) => void;
  effectCallback: NavigationEffectCb | null;
  setEffectCallback: (cb: NavigationEffectCb | null) => void;
  navigateRef: MutableRefObject<SimpleNavigate | undefined>;
}

export type SimpleNavigate = (target: string, options?: NavigateOptions) => void;

function newStore({ initialLocation }: { initialLocation: string | undefined }) {
  return createStore<Context>((set) => ({
    hash: initialLocation ? initialLocation : `${window.location.hash}`,
    updateHash: (hash: string) => set({ hash }),
    effectCallback: null,
    setEffectCallback: (effectCallback: NavigationEffectCb) => set({ effectCallback }),
    navigateRef: { current: undefined },
  }));
}

const { Provider, useSelector, useStaticSelector, useMemoSelector, useStore } = createZustandContext<
  ReturnType<typeof newStore>
>({
  name: 'AppRouting',
  required: true,
  initialCreateStore: newStore,
});

/**
 * This provider is responsible for keeping track of the URL (hash) and providing hooks to read it. It fixes a
 * fundamental issue with the react-router-dom library, where every hook reading the URL will cause a re-render
 * regardless of whether the part of the URL you were actually interested in has changed or not. That includes
 * the useNavigate() hook, which re-renders your component every time you navigate to a new URL - just so that it
 * can support relative navigation.
 *
 * This wrapper solves this by making sure both of these use-cases gives you the most up-to-date URL:
 *  1. When rendering a new component for the first time, caused by a route change, the URL is read from the current
 *     window.location.hash (not from the zustand store).
 *  2. When the URL changes after the component has been rendered, all selectors will re-run and only re-render the
 *     component if the part of the URL they are interested in has changed (based on the zustand equality check).
 *
 * In an earlier iteration this read the URL parts from the zustand store as well, and updated them in a useEffect,
 * but that caused the store to be out of sync with the actual URL - which in turn lead to some components getting
 * the wrong state (and thus rendered the wrong thing) at first, only to correct itself after the useEffect had run.
 */
export function AppRoutingProvider({ children }: PropsWithChildren) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const location = window.inUnitTest ? useLocation() : undefined;
  const initialLocation = location ? location.pathname + location.search : undefined;

  return (
    <Provider initialLocation={initialLocation}>
      <UpdateHash />
      <UpdateNavigate />
      {children}
    </Provider>
  );
}

function getPath(hashFromState: string): string {
  const hash = window.inUnitTest ? `#${hashFromState}` : window.location.hash;
  return hash.slice(1).split('?')[0];
}

export function getSearch(hashFromState: string): string {
  const hash = window.inUnitTest ? hashFromState : window.location.hash;
  const search = hash.split('?')[1] ?? '';
  return search ? `?${search}` : '';
}

/**
 * This pretends to be a ref, but it's actually a getter that returns the current value (executes the getter each
 * time you access the `current` property).
 */
class OnDemandRef<T> {
  constructor(private readonly getter: () => T) {}

  get current() {
    return this.getter();
  }
}

function useStaticRef<T>(getter: (state: Context) => T) {
  const store = useStore();
  return new OnDemandRef(() => getter(store.getState())) as { current: T };
}

export const useQueryKeysAsStringAsRef = () => useStaticRef((s) => getSearch(s.hash));
export const useAllNavigationParamsAsRef = () => useStaticRef((s) => matchParams(getPath(s.hash)));

export const useNavigationParam = <T extends keyof PathParams>(key: T) =>
  useSelector((s) => {
    const path = getPath(s.hash);
    const matches = matchers.map((matcher) => matchPath(matcher, path));
    return paramFrom(matches, key) as PathParams[T];
  });

export const useIsCurrentView = (pageKey: string | undefined) =>
  useSelector((s) => {
    const path = getPath(s.hash);
    const matches = matchers.map((matcher) => matchPath(matcher, path));
    return paramFrom(matches, 'pageKey') === pageKey;
  });

export const useNavigationPath = () => useSelector((s) => getPath(s.hash));
export const useNavigationParams = () => useMemoSelector((s) => matchParams(getPath(s.hash)));
export const useNavigationEffect = () => useSelector((ctx) => ctx.effectCallback);
export const useSetNavigationEffect = () => useSelector((ctx) => ctx.setEffectCallback);
export const useQueryKeysAsString = () => useSelector((s) => getSearch(s.hash));
export const useQueryKey = (key: SearchParams) => useSelector((s) => new URLSearchParams(getSearch(s.hash)).get(key));

export const useIsSubformPage = () =>
  useSelector((s) => {
    const path = getPath(s.hash);
    const matches = matchers.map((matcher) => matchPath(matcher, path));
    const mainPageKey = paramFrom(matches, 'mainPageKey');
    const subformPageKey = paramFrom(matches, 'pageKey');
    return !!(mainPageKey && subformPageKey);
  });

export const useIsReceiptPage = () =>
  useSelector((s) => {
    const path = getPath(s.hash);
    const matches = matchers.map((matcher) => matchPath(matcher, path));
    const taskId = paramFrom(matches, 'taskId');
    return taskId === 'ProcessEnd' || taskId === 'CustomReceipt';
  });

// Use this instead of the native one to avoid re-rendering whenever the route changes
export const useNavigate = () => useStaticSelector((ctx) => ctx.navigateRef).current!;

const matchers: string[] = [
  '/instance/:instanceOwnerPartyId/:instanceGuid',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:pageKey',
  '/:pageKey', // Stateless

  // Subform
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:mainPageKey/:componentId',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:mainPageKey/:componentId/:dataElementId',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:mainPageKey/:componentId/:dataElementId/:pageKey',
];

type Matches = ReturnType<typeof matchPath>[];

const requiresDecoding: Set<keyof PathParams> = new Set(['pageKey', 'mainPageKey']);

function paramFrom(matches: Matches, key: keyof PathParams): string | undefined {
  const param = matches.reduce((acc, match) => acc ?? match?.params[key], undefined);
  const decode = requiresDecoding.has(key);
  return decode && param ? decodeURIComponent(param) : param;
}

function matchParams(path: string): PathParams {
  const matches = matchers.map((matcher) => matchPath(matcher, path));
  return {
    instanceOwnerPartyId: paramFrom(matches, 'instanceOwnerPartyId'),
    instanceGuid: paramFrom(matches, 'instanceGuid'),
    taskId: paramFrom(matches, 'taskId'),
    pageKey: paramFrom(matches, 'pageKey'),
    componentId: paramFrom(matches, 'componentId'),
    dataElementId: paramFrom(matches, 'dataElementId'),
    mainPageKey: paramFrom(matches, 'mainPageKey'),
  };
}

/**
 * The URL hash is saved into the zustand store, but it's never read from there. This just serves to trigger the
 * selectors to re-run when the hash changes, thus making the hooks that depend on the hash re-run and figure out
 * if components should re-render based on URL changes.
 */
function UpdateHash() {
  const updateHash = useStaticSelector((ctx) => ctx.updateHash);
  const location = useLocation();
  const hash = location.pathname + location.search;

  setTimeout(() => {
    updateHash(hash);
  }, 0);

  return null;
}

function UpdateNavigate() {
  const store = useStore();
  const navigateRef = useStaticSelector((ctx) => ctx.navigateRef);
  const nativeNavigate = useNativeNavigate();

  navigateRef.current = (target, options) => {
    if (target && !target.startsWith('/')) {
      // Used for relative navigation, e.g. navigating to a subform page
      const currentPath = getPath(store.getState().hash).replace(/\/$/, '');
      const newTarget = `${currentPath}/${target}`;
      nativeNavigate(newTarget, options);
      return;
    }
    nativeNavigate(target, options);
  };

  return null;
}

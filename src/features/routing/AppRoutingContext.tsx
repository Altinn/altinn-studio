import React, { useEffect } from 'react';
import { useLocation, useMatch, useNavigate as useNativeNavigate } from 'react-router-dom';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';

export type NavigationEffectCb = () => void;

interface ContextParams {
  partyId?: string;
  instanceGuid?: string;
  taskId?: string;
  pageKey?: string;
  componentId?: string;
  dataElementId?: string;
  mainPageKey?: string;
  isSubformPage?: boolean;
}
interface Context {
  params: ContextParams;
  queryKeys: {
    [key: string]: string | undefined;
  };
  updateParams: (params: Context['params']) => void;
  updateQueryKeys: (queryKeys: Context['queryKeys']) => void;
  effectCallback: NavigationEffectCb | null;
  setEffectCallback: (cb: NavigationEffectCb | null) => void;
  navigateRef: MutableRefObject<ReturnType<typeof useNativeNavigate>>;
}

function newStore() {
  return createStore<Context>((set) => ({
    params: {},
    queryKeys: {},
    updateParams: (params) => set({ params }),
    updateQueryKeys: (queryKeys) => set({ queryKeys }),
    effectCallback: null,
    setEffectCallback: (effectCallback: NavigationEffectCb) => set({ effectCallback }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigateRef: { current: undefined as any },
  }));
}

const { Provider, useSelector, useSelectorAsRef } = createZustandContext<ReturnType<typeof newStore>>({
  name: 'AppRouting',
  required: true,
  initialCreateStore: newStore,
});

export function AppRoutingProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <UpdateParams />
      <UpdateQueryKeys />
      <UpdateNavigate />
      {children}
    </Provider>
  );
}

export const useAllNavigationParamsAsRef = () => useSelectorAsRef((ctx) => ctx.params);
export const useNavigationParam = <T extends keyof ContextParams>(key: T) => useSelector((ctx) => ctx.params[key]);
export const useNavigationEffect = () => useSelector((ctx) => ctx.effectCallback);
export const useSetNavigationEffect = () => useSelector((ctx) => ctx.setEffectCallback);
export const useQueryKeysAsString = () => useSelector((ctx) => queryKeysToString(ctx.queryKeys));
export const useQueryKeysAsStringAsRef = () => useSelectorAsRef((ctx) => queryKeysToString(ctx.queryKeys));
export const useQueryKey = (key: string) => useSelector((ctx) => ctx.queryKeys[key]);

// Use this instead of the native one to avoid re-rendering whenever the route changes
export const useNavigate = () => useSelector((ctx) => ctx.navigateRef).current;

export const useNavigationParams = (): Context['params'] => {
  const matches = [
    useMatch('/instance/:partyId/:instanceGuid'),
    useMatch('/instance/:partyId/:instanceGuid/:taskId'),
    useMatch('/instance/:partyId/:instanceGuid/:taskId/:pageKey'),
    useMatch('/:pageKey'), // Stateless

    // Subform
    useMatch('/instance/:partyId/:instanceGuid/:taskId/:mainPageKey/:componentId'),
    useMatch('/instance/:partyId/:instanceGuid/:taskId/:mainPageKey/:componentId/:dataElementId'),
    useMatch('/instance/:partyId/:instanceGuid/:taskId/:mainPageKey/:componentId/:dataElementId/:pageKey'),
  ];

  const partyId = matches.reduce((acc, match) => acc ?? match?.params['partyId'], undefined);
  const instanceGuid = matches.reduce((acc, match) => acc ?? match?.params['instanceGuid'], undefined);
  const taskId = matches.reduce((acc, match) => acc ?? match?.params['taskId'], undefined);
  const componentId = matches.reduce((acc, match) => acc ?? match?.params['componentId'], undefined);
  const dataElementId = matches.reduce((acc, match) => acc ?? match?.params['dataElementId'], undefined);
  const _pageKey = matches.reduce((acc, match) => acc ?? match?.params['pageKey'], undefined);
  const _mainPageKey = matches.reduce((acc, match) => acc ?? match?.params['mainPageKey'], undefined);
  const pageKey = _pageKey === undefined ? undefined : decodeURIComponent(_pageKey);
  const mainPageKey = _mainPageKey === undefined ? undefined : decodeURIComponent(_mainPageKey);

  const isSubformPage = !!mainPageKey;

  return {
    partyId,
    instanceGuid,
    taskId,
    pageKey,
    componentId,
    dataElementId,
    mainPageKey,
    isSubformPage,
  };
};

function UpdateParams() {
  const updateParams = useSelector((ctx) => ctx.updateParams);
  const params = useNavigationParams();

  useEffect(() => {
    updateParams(params);
  }, [params, updateParams]);

  return null;
}

function UpdateQueryKeys() {
  const queryKeys = useLocation().search ?? '';
  const updateQueryKeys = useSelector((ctx) => ctx.updateQueryKeys);

  useEffect(() => {
    const map = Object.fromEntries(new URLSearchParams(queryKeys).entries());
    updateQueryKeys(map);
  }, [queryKeys, updateQueryKeys]);

  return null;
}

function UpdateNavigate() {
  const navigateRef = useSelector((ctx) => ctx.navigateRef);
  navigateRef.current = useNativeNavigate();

  return null;
}

function queryKeysToString(qc: Context['queryKeys']): string {
  const qcFiltered = Object.fromEntries(Object.entries(qc).filter(filterUndefined));
  if (Object.keys(qcFiltered).length === 0) {
    return '';
  }

  const searchParams = new URLSearchParams(qcFiltered);
  return `?${searchParams.toString()}`;
}

function filterUndefined(obj: [string, string | undefined]): obj is [string, string] {
  return obj[1] !== undefined;
}

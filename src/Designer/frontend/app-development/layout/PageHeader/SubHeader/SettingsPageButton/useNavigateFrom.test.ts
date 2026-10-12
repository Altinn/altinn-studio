import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigateFrom } from './useNavigateFrom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useLocation } from 'react-router-dom';
import { typedLocalStorage } from '@studio/pure-functions';
import { LocalStorageKey } from 'app-shared/enums/LocalStorageKey';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useLocation: vi.fn().mockImplementation(() => ({
    pathname: '',
    state: { from: '' },
  })),
}));

describe('useNavigateFrom', () => {
  afterEach(() => {
    vi.clearAllMocks();
    typedLocalStorage.removeItem(LocalStorageKey.PreviousRouteBeforeSettings);
  });

  it('returns navigateFrom and currentRoutePath when state and pathname are provided', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: { from: RoutePaths.UIEditor },
    });

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: RoutePaths.UIEditor,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });

  it('returns undefined for navigateFrom when state is null', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: null,
    });

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: undefined,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });

  it('returns undefined for navigateFrom when state has no "from" and local storage is not set', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: {},
    });

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: undefined,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });

  it('returns the localstorage if "from" is missing and localstorage is set', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: {},
    });
    typedLocalStorage.setItem(
      LocalStorageKey.PreviousRouteBeforeSettings,
      RoutePaths.ProcessEditor,
    );

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: RoutePaths.ProcessEditor,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });

  it('returns the state if "from" is set and localstorage is set', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: { from: RoutePaths.UIEditor },
    });
    typedLocalStorage.setItem(
      LocalStorageKey.PreviousRouteBeforeSettings,
      RoutePaths.ProcessEditor,
    );

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: RoutePaths.UIEditor,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });

  it('returns the correct currentRoutePahth when pathname and search are provided', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      search: '?query=123',
      state: { from: RoutePaths.UIEditor },
    });

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: RoutePaths.UIEditor,
      currentRoutePath: `${RoutePaths.AppSettings}?query=123`,
    });
  });
});

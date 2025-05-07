import { renderHook } from '@testing-library/react';
import { useNavigateFrom } from './useNavigateFrom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useLocation } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockImplementation(() => ({
    pathname: '',
    state: { from: '' },
  })),
}));

describe('useNavigateFrom', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns navigateFrom and currentRoutePath when state and pathname are provided', () => {
    (useLocation as jest.Mock).mockReturnValue({
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
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: null,
    });

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: undefined,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });

  it('returns undefined for navigateFrom when state has no "from"', () => {
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: {},
    });

    const { result } = renderHook(() => useNavigateFrom());

    expect(result.current).toEqual({
      navigateFrom: undefined,
      currentRoutePath: RoutePaths.AppSettings,
    });
  });
});

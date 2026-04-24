import { renderHook } from '@testing-library/react';
import { useRequiredRoutePathsParams } from './useRequiredRoutePathsParams';
import { useRequiredParams } from 'app-shared/hooks/useRequiredParams';

jest.mock('app-shared/hooks/useRequiredParams', () => ({
  useRequiredParams: jest.fn(),
}));

describe('useRequiredRoutePathsParams', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards required params and returns shared hook result', () => {
    const sharedResult = { owner: 'ttd', app: 'my-app' };
    (useRequiredParams as jest.Mock).mockReturnValue(sharedResult);

    const { result } = renderHook(() => useRequiredRoutePathsParams(['owner', 'app']));

    expect(useRequiredParams).toHaveBeenCalledWith(['owner', 'app']);
    expect(result.current).toEqual(sharedResult);
  });
});

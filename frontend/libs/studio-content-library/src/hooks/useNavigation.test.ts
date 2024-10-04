import { useNavigation } from './useNavigation';
import type { PageName } from '../types/PageName';
import { act, renderHook } from '@testing-library/react';
import { type QueryParamsRouter } from '../utils/router/QueryParamsRouter';

interface RouterInstanceMock extends QueryParamsRouter {
  getCurrentRoute: jest.Mock;
  navigate: jest.Mock;
}

const mockRouterInstance: RouterInstanceMock = {
  getCurrentRoute: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('../utils/router/QueryParamsRouter', () => ({
  QueryParamsRouterImpl: {
    getInstance: jest.fn(() => mockRouterInstance),
  },
}));

describe('useNavigation Hook', () => {
  const mockCurrentPage: PageName = 'root';

  beforeEach(() => {
    mockRouterInstance.getCurrentRoute.mockReturnValue(mockCurrentPage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the current page', () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.currentPage).toBe(mockCurrentPage);
  });

  it('should navigate to a new page', () => {
    const newPage: PageName = 'codeList';

    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate(newPage);
    });

    expect(mockRouterInstance.navigate).toHaveBeenCalledWith(newPage);
    expect(result.current.currentPage).toBe(newPage);
  });
});

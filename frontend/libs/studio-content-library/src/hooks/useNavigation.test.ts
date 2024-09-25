import { useNavigation } from './useNavigation';
import type { Page } from '../types';
import { act, renderHook } from '@testing-library/react';

const mockRouterInstance = {
  getCurrentRoute: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('../utils/router/QueryParamsRouter', () => ({
  QueryParamsRouterImpl: {
    getInstance: jest.fn(() => mockRouterInstance), // Return the mock instance
  },
}));

describe('useNavigation Hook', () => {
  const mockCurrentPage = 'root' as Page;

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
    const newPage = 'codeList' as Page;

    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate(newPage);
    });

    expect(mockRouterInstance.navigate).toHaveBeenCalledWith(newPage);
    expect(result.current.currentPage).toBe(newPage);
  });
});

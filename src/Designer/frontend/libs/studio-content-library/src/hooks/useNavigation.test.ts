import { useNavigation } from './useNavigation';
import type { PageName } from '../types/PageName';
import { act, renderHook } from '@testing-library/react';
import { type QueryParamsRouter } from '../utils/router/QueryParamsRouter';

interface RouterInstanceMock extends QueryParamsRouter {
  currentRoute: PageName;
  navigate: jest.Mock;
}

const mockRouterInstance: RouterInstanceMock = {
  currentRoute: 'landingPage',
  navigate: jest.fn(),
};

jest.mock('../utils/router/QueryParamsRouter', () => ({
  QueryParamsRouterImpl: {
    getInstance: jest.fn(() => mockRouterInstance),
  },
}));

describe('useNavigation Hook', () => {
  const mockCurrentPage: PageName = 'landingPage';

  beforeEach(() => {
    mockRouterInstance.currentRoute = mockCurrentPage;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the current page', () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.currentPage).toBe(mockCurrentPage);
  });

  it('should navigate to a new page', () => {
    const newPage: PageName = 'codeListsWithTextResources';

    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate(newPage);
    });

    expect(mockRouterInstance.navigate).toHaveBeenCalledWith(newPage);
    expect(result.current.currentPage).toBe(newPage);
  });
});

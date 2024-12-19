import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('should initialize with the first page', () => {
    const { result } = renderHook(() => usePagination(5));
    expect(result.current.currentPage).toBe(0);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should go to the next page', () => {
    const { result } = renderHook(() => usePagination(5));
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should not go to the next page if on the last page', () => {
    const { result } = renderHook(() => usePagination(1));
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentPage).toBe(0);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should go to the previous page', () => {
    const { result } = renderHook(() => usePagination(5));
    act(() => {
      result.current.goNext();
    });
    act(() => {
      result.current.goPrevious();
    });
    expect(result.current.currentPage).toBe(0);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should not go to the previous page if on the first page', () => {
    const { result } = renderHook(() => usePagination(5));
    act(() => {
      result.current.goPrevious();
    });
    expect(result.current.currentPage).toBe(0);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(true);
  });
});

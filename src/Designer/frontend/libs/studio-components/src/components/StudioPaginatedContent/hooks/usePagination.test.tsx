import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';
import { type StudioPaginatedItem } from '../types/StudioPaginatedItem';

const items: StudioPaginatedItem[] = [
  { pageContent: <div>Page 1</div>, validationRuleForNextButton: true },
  { pageContent: <div>Page 2</div>, validationRuleForNextButton: true },
  { pageContent: <div>Page 3</div>, validationRuleForNextButton: false },
];

describe('usePagination', () => {
  it('should initialize with the first page', () => {
    const { result } = renderHook(() => usePagination(items));
    expect(result.current.currentPage).toBe(0);
    expect(result.current.pages).toHaveLength(3);
    expect(result.current.navigation.canGoNext).toBe(true);
    expect(result.current.navigation.canGoPrevious).toBe(false);
  });

  it('should set canGoNext to true when validationRuleForNextButton is undefined', () => {
    const itemsWithoutValidationRuleForNextButton: StudioPaginatedItem[] = [
      { pageContent: <div>Page 1</div> },
      { pageContent: <div>Page 2</div> },
    ];
    const { result } = renderHook(() => usePagination(itemsWithoutValidationRuleForNextButton));

    expect(result.current.currentPage).toBe(0);
    expect(result.current.pages).toHaveLength(2);
    expect(result.current.navigation.canGoNext).toBe(true);
    expect(result.current.navigation.canGoPrevious).toBe(false);
  });

  it('should go to the next page if validation rule allows', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => {
      result.current.navigation.onNext();
    });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.navigation.canGoNext).toBe(true);
    expect(result.current.navigation.canGoPrevious).toBe(true);
  });

  it('should not go to the next page if validation rule does not allow', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => {
      result.current.navigation.onNext();
      result.current.navigation.onNext();
    });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.navigation.canGoNext).toBe(false);
    expect(result.current.navigation.canGoPrevious).toBe(true);
  });

  it('should go to the previous page', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => {
      result.current.navigation.onNext();
    });
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.navigation.onPrevious();
    });
    expect(result.current.currentPage).toBe(0);

    expect(result.current.navigation.canGoNext).toBe(true);
    expect(result.current.navigation.canGoPrevious).toBe(false);
  });

  it('should not go to the previous page if already on the first page', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => {
      result.current.navigation.onPrevious();
    });
    expect(result.current.currentPage).toBe(0);
    expect(result.current.navigation.canGoNext).toBe(true);
    expect(result.current.navigation.canGoPrevious).toBe(false);
  });

  it('should handle empty items: no pages and cannot go next/previous', () => {
    const { result } = renderHook(() => usePagination([]));
    expect(result.current.pages).toHaveLength(0);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.navigation.canGoNext).toBe(false);
    expect(result.current.navigation.canGoPrevious).toBe(false);
  });

  it('should clamp current page when items shrink', () => {
    const initialItems: StudioPaginatedItem[] = [
      { pageContent: <div>Page 1</div>, validationRuleForNextButton: true },
      { pageContent: <div>Page 2</div>, validationRuleForNextButton: true },
      { pageContent: <div>Page 3</div>, validationRuleForNextButton: true },
    ];
    const { result, rerender } = renderHook(({ data }) => usePagination(data), {
      initialProps: { data: initialItems },
    });
    act(() => {
      result.current.navigation.onNext();
      result.current.navigation.onNext();
    });
    expect(result.current.currentPage).toBe(2);
    const smallerItems: StudioPaginatedItem[] = [
      { pageContent: <div>Page 1</div>, validationRuleForNextButton: true },
      { pageContent: <div>Page 2</div>, validationRuleForNextButton: true },
    ];
    rerender({ data: smallerItems });
    expect(result.current.pages).toHaveLength(2);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.navigation.canGoNext).toBe(false);
    expect(result.current.navigation.canGoPrevious).toBe(true);
  });
});

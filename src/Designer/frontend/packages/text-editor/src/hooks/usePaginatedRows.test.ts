import { act, renderHook } from '@testing-library/react';
import { usePaginatedRows } from './usePaginatedRows';

describe('usePaginatedRows', () => {
  const rows = Array.from({ length: 7 }, (_, index) => `row-${index}`);
  const pageSize = 3;

  it('returns the first page and the number of pages', () => {
    const { result } = renderHook(() => usePaginatedRows(rows, pageSize, 'key'));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.rowsOnPage).toEqual(['row-0', 'row-1', 'row-2']);
  });

  it('returns the rows of the selected page', () => {
    const { result } = renderHook(() => usePaginatedRows(rows, pageSize, 'key'));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.rowsOnPage).toEqual(['row-6']);
  });

  it('reports a single page when there are no rows', () => {
    const { result } = renderHook(() => usePaginatedRows([], pageSize, 'key'));

    expect(result.current.pageCount).toBe(1);
    expect(result.current.rowsOnPage).toEqual([]);
  });

  it('returns to the first page when the reset key changes', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => usePaginatedRows(rows, pageSize, resetKey),
      { initialProps: { resetKey: 'a' } },
    );

    act(() => {
      result.current.goToPage(3);
    });
    expect(result.current.currentPage).toBe(3);

    rerender({ resetKey: 'b' });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.rowsOnPage).toEqual(['row-0', 'row-1', 'row-2']);
  });

  it('falls back to the last page when the rows no longer reach the selected page', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePaginatedRows(items, pageSize, 'key'),
      { initialProps: { items: rows } },
    );

    act(() => {
      result.current.goToPage(3);
    });

    rerender({ items: rows.slice(0, 4) });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.rowsOnPage).toEqual(['row-3']);
  });
});

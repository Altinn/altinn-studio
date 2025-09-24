import { useTableSorting } from './useTableSorting';
import { act, renderHook } from '@testing-library/react';
import type { Rows } from '../../../studio-components/src/components';
import { typedLocalStorage } from '@studio/pure-functions';
import { TableSortStorageKey } from '../../../studio-components/src/types/TableSortStorageKey';

describe('useTableSorting', () => {
  const rows: Rows = [
    {
      id: 1,
      name: 'A form',
      creator: 'Digdir',
    },
    {
      id: 2,
      name: 'B form',
      creator: 'Brreg',
    },
    {
      id: 3,
      name: 'C form',
      creator: 'Skatt',
    },
  ];

  it('should render the initial state', () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: true }));
    expect(result.current.sortedRows).toEqual(rows);
  });

  it('should sort rows in ascending order when a column is clicked', async () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: true }));
    act(() => result.current.handleSorting!('creator'));

    const creatorsAscending: string[] = [];
    result.current.sortedRows!.forEach((row) => {
      creatorsAscending.push(String(row.creator));
    });

    expect(creatorsAscending[0]).toEqual('Brreg');
    expect(creatorsAscending[1]).toEqual('Digdir');
    expect(creatorsAscending[2]).toEqual('Skatt');
  });

  it('should sort rows in descending order when the same column is clicked again', async () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: true }));
    act(() => result.current.handleSorting!('creator'));
    act(() => result.current.handleSorting!('creator'));

    const creatorsDescending: string[] = [];
    result.current.sortedRows!.forEach((row) => {
      creatorsDescending.push(String(row.creator));
    });

    expect(creatorsDescending[0]).toEqual('Skatt');
    expect(creatorsDescending[1]).toEqual('Digdir');
    expect(creatorsDescending[2]).toEqual('Brreg');
  });

  it('should reset the sort direction to ascending when a different column is clicked', async () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: true }));
    act(() => result.current.handleSorting!('creator'));
    act(() => result.current.handleSorting!('id'));
    expect(result.current.sortedRows!).toEqual(rows);
  });

  it("should make 'sortedRows' and 'handleSorting' undefined when enable is false", () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: false }));
    expect(result.current.sortedRows).toBeUndefined();
    expect(result.current.handleSorting).toBeUndefined();
  });

  it('should persist sort preference when toggling sort direction with persistence enabled', () => {
    const setItemSpy = jest.spyOn(typedLocalStorage, 'setItem');
    const { result } = renderHook(() =>
      useTableSorting(rows, { enable: true, shouldPersistSort: true }),
    );

    act(() => result.current.handleSorting!('creator'));
    expect(setItemSpy).toHaveBeenCalledWith(TableSortStorageKey.Default, {
      column: 'creator',
      direction: 'asc',
    });

    act(() => result.current.handleSorting!('creator'));
    expect(setItemSpy).toHaveBeenCalledWith(TableSortStorageKey.Default, {
      column: 'creator',
      direction: 'desc',
    });
  });

  it('should handle equal values by returning 0 in comparator (stable order)', () => {
    const equalRows: Rows = [
      { id: 1, creator: 'Alpha', name: 'First' },
      { id: 2, creator: 'alpha', name: 'Second' },
    ];
    const { result } = renderHook(() => useTableSorting(equalRows, { enable: true }));
    act(() => result.current.handleSorting!('creator'));
    expect(result.current.sortedRows![0].id).toBe(1);
    expect(result.current.sortedRows![1].id).toBe(2);
  });

  it('should handle null/undefined cells in comparator without changing order', () => {
    const rowsWithMissing: Rows = [
      { id: 1, name: 'Has creator', creator: 'a' },
      { id: 2, name: 'Missing creator', creator: undefined },
      { id: 3, name: 'Has creator too', creator: 'b' },
    ];
    const { result } = renderHook(() => useTableSorting(rowsWithMissing, { enable: true }));
    act(() => result.current.handleSorting!('creator'));
    expect(result.current.sortedRows).toHaveLength(3);
    const ids = result.current.sortedRows!.map((r) => Number(r.id));
    expect(ids).toEqual([1, 2, 3]);
  });
});

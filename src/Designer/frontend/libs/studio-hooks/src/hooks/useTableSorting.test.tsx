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
});

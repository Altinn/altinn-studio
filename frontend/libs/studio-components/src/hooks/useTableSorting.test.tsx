import { useTableSorting } from './useTableSorting';
import { renderHook, waitFor } from '@testing-library/react';
import type { Rows } from '../components';

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
    await waitFor(() => result.current.handleSorting('creator'));

    const CreatorsAscending: string[] = [];
    result.current.sortedRows.forEach((row) => {
      CreatorsAscending.push(row.creator);
    });

    expect(CreatorsAscending[0]).toEqual('Brreg');
    expect(CreatorsAscending[1]).toEqual('Digdir');
    expect(CreatorsAscending[2]).toEqual('Skatt');
  });

  it('should sort rows in descending order when the same column is clicked again', async () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: true }));
    await waitFor(() => result.current.handleSorting('creator'));
    await waitFor(() => result.current.handleSorting('creator'));

    const CreatorsDescending: string[] = [];
    result.current.sortedRows.forEach((row) => {
      CreatorsDescending.push(row.creator);
    });

    expect(CreatorsDescending[0]).toEqual('Skatt');
    expect(CreatorsDescending[1]).toEqual('Digdir');
    expect(CreatorsDescending[2]).toEqual('Brreg');
  });

  it('should reset the sort direction to ascending when a different column is clicked', async () => {
    const { result } = renderHook(() => useTableSorting(rows, { enable: true }));
    await waitFor(() => result.current.handleSorting('creator'));
    await waitFor(() => result.current.handleSorting('id'));
    expect(result.current.sortedRows).toEqual(rows);
  });
});

import { getRowsToRender } from './utils';

describe('getRowsToRender', () => {
  const rows = [
    { id: 1, name: 'Row 1' },
    { id: 2, name: 'Row 2' },
    { id: 3, name: 'Row 3' },
    { id: 4, name: 'Row 4' },
    { id: 5, name: 'Row 5' },
  ];

  it('should return all rows when pageSize is 0', () => {
    const currentPage = 1;
    const pageSize = 0;
    const rowsToRender = getRowsToRender(currentPage, pageSize, rows);
    expect(rowsToRender).toEqual(rows);
  });

  it('should return the correct rows for the first page', () => {
    const currentPage = 1;
    const pageSize = 2;
    const rowsToRender = getRowsToRender(currentPage, pageSize, rows);

    expect(rowsToRender).toEqual([
      { id: 1, name: 'Row 1' },
      { id: 2, name: 'Row 2' },
    ]);
  });

  it('should return the correct rows for the last page', () => {
    const currentPage = 3;
    const pageSize = 2;
    const rowsToRender = getRowsToRender(currentPage, pageSize, rows);

    expect(rowsToRender).toEqual([{ id: 5, name: 'Row 5' }]);
  });

  it('should return an empty array when currentPage is out of range', () => {
    const currentPage = 4;
    const pageSize = 2;
    const rowsToRender = getRowsToRender(currentPage, pageSize, rows);

    expect(rowsToRender).toEqual([]);
  });

  it('should return an empty array when rows is an empty array', () => {
    const currentPage = 1;
    const pageSize = 2;
    const rowsToRender = getRowsToRender(currentPage, pageSize, []);

    expect(rowsToRender).toEqual([]);
  });
});

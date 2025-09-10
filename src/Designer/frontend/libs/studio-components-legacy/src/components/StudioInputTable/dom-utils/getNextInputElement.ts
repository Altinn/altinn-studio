import type { CellCoords } from '../types/CellCoords';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';

export function getNextInputElement(
  element: HTMLElement,
  key: string,
): HTMLCellInputElement | null {
  const currentCoords = getParentCellCoords(element);
  const table = getParentTable(element);
  if (!table) throw Error('Element is not within a table.');
  switch (key) {
    case 'ArrowUp':
      return getInputElementAboveCoords(table, currentCoords);
    case 'ArrowDown':
    case 'Enter':
      return getInputElementBelowCoords(table, currentCoords);
    case 'ArrowLeft':
      return getInputElementLeftToCoords(table, currentCoords);
    case 'ArrowRight':
      return getInputElementRightToCoords(table, currentCoords);
    default:
      return null;
  }
}

function getParentCellCoords(element: HTMLElement): CellCoords {
  const row = getParentRowIndex(element);
  const column = getParentColumnIndex(element);
  return { row, column };
}

function getParentRowIndex(element: HTMLElement): number {
  const row = element.closest('tr');
  if (!row) throw Error('Element is not within a table row.');
  return getRowIndex(row);
}

function getRowIndex(row: HTMLTableRowElement): number {
  const table = row.closest('table');
  if (!table) throw Error('Row is not within a table.');
  const rows = Array.from(table.querySelectorAll('tr'));
  return rows.indexOf(row);
}

function getParentColumnIndex(element: HTMLElement): number {
  const cell: HTMLTableCellElement | null = element.closest('td, th');
  if (!cell) throw Error('Element is not within a table cell.');
  return getColumnIndex(cell);
}

function getColumnIndex(cell: HTMLTableCellElement): number {
  const row = cell.closest('tr');
  if (!row) throw Error('Cell is not within a table row.');
  const cells = Array.from(row.cells);
  return cells.indexOf(cell);
}

function getParentTable(element: HTMLElement): HTMLTableElement | null {
  return element.closest('table');
}

function getInputElementBelowCoords(
  table: HTMLTableElement,
  coords: CellCoords,
): HTMLCellInputElement | null {
  const nextRow = coords.row + 1;
  if (nextRow >= table.rows.length) return null;
  const nextCoords: CellCoords = { ...coords, row: coords.row + 1 };
  return (
    getInputElementByCoords(table, nextCoords) || getInputElementBelowCoords(table, nextCoords)
  );
}

function getInputElementAboveCoords(
  table: HTMLTableElement,
  coords: CellCoords,
): HTMLCellInputElement | null {
  const previousRow = coords.row - 1;
  if (previousRow < 0) return null;
  const previousCoords: CellCoords = { ...coords, row: coords.row - 1 };
  return (
    getInputElementByCoords(table, previousCoords) ||
    getInputElementAboveCoords(table, previousCoords)
  );
}

function getInputElementRightToCoords(
  table: HTMLTableElement,
  coords: CellCoords,
): HTMLCellInputElement | null {
  const nextColumn = coords.column + 1;
  if (nextColumn >= table.rows[0].cells.length) return null;
  const nextCoords: CellCoords = { ...coords, column: coords.column + 1 };
  return (
    getInputElementByCoords(table, nextCoords) || getInputElementRightToCoords(table, nextCoords)
  );
}

function getInputElementLeftToCoords(
  table: HTMLTableElement,
  coords: CellCoords,
): HTMLCellInputElement | null {
  const previousColumn = coords.column - 1;
  if (previousColumn < 0) return null;
  const previousCoords: CellCoords = { ...coords, column: coords.column - 1 };
  return (
    getInputElementByCoords(table, previousCoords) ||
    getInputElementLeftToCoords(table, previousCoords)
  );
}

function getInputElementByCoords(
  table: HTMLTableElement,
  coords: CellCoords,
): HTMLCellInputElement | null {
  const cell = getCellByCoords(table, coords);
  return cell.querySelector(inputElementSelector) || null;
}

const inputElementSelector = 'input, textarea, button';

function getCellByCoords(table: HTMLTableElement, coords: CellCoords): HTMLTableCellElement {
  const row = table.rows[coords.row];
  return row.cells[coords.column];
}

import type { CellCoords } from '../types/CellCoords';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';

export function getNextInputElement(
  element: HTMLCellInputElement,
  key: string,
): HTMLCellInputElement | null {
  const table = getParentTable(element);
  switch (key) {
    case 'ArrowUp':
      return getInputElementAbove(table, element);
    case 'ArrowDown':
    case 'Enter':
      return getInputElementBelow(table, element);
    case 'ArrowLeft':
      return getInputElementToTheLeft(table, element);
    case 'ArrowRight':
      return getInputElementToTheRight(table, element);
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
  return getRowIndex(row);
}

function getRowIndex(row: HTMLTableRowElement): number {
  const table = row.closest('table');
  const rows = Array.from(table.querySelectorAll('tr'));
  return rows.indexOf(row);
}

function getParentColumnIndex(element: HTMLElement): number {
  const cell: HTMLTableCellElement = element.closest('td, th');
  return getColumnIndex(cell);
}

function getColumnIndex(cell: HTMLTableCellElement): number {
  const row = cell.closest('tr');
  const cells = Array.from(row.cells);
  return cells.indexOf(cell);
}

function getParentTable(element: HTMLElement): HTMLTableElement | null {
  return element.closest('table');
}

function getInputElementBelow(
  table: HTMLTableElement,
  element: HTMLCellInputElement,
): HTMLCellInputElement | null {
  const coords = getParentCellCoords(element);
  return getInputElementBelowCoords(table, coords);
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

function getInputElementAbove(
  table: HTMLTableElement,
  element: HTMLCellInputElement,
): HTMLCellInputElement | null {
  const coords = getParentCellCoords(element);
  return getInputElementAboveCoords(table, coords);
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

function getInputElementToTheRight(
  table: HTMLTableElement,
  element: HTMLCellInputElement,
): HTMLCellInputElement | null {
  const nextElementInSameCell = getNextElementInsideCell(table, element);
  if (nextElementInSameCell) return nextElementInSameCell;
  const coords = getParentCellCoords(element);
  return getInputElementRightToCoords(table, coords);
}

function getNextElementInsideCell(
  table: HTMLTableElement,
  element: HTMLCellInputElement,
): HTMLCellInputElement | null {
  const coords = getParentCellCoords(element);
  const elements = getInputElementsByCoords(table, coords);
  const index = elements.indexOf(element);
  return elements[index + 1] || null;
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

function getInputElementToTheLeft(
  table: HTMLTableElement,
  element: HTMLCellInputElement,
): HTMLCellInputElement | null {
  const previousElementInSameCell = getPreviousElementInsideCell(table, element);
  if (previousElementInSameCell) return previousElementInSameCell;
  const coords = getParentCellCoords(element);
  return getInputElementLeftToCoords(table, coords);
}

function getPreviousElementInsideCell(
  table: HTMLTableElement,
  element: HTMLCellInputElement,
): HTMLCellInputElement | null {
  const coords = getParentCellCoords(element);
  const elements = getInputElementsByCoords(table, coords);
  const index = elements.indexOf(element);
  return elements[index - 1] || null;
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
  const elements = getInputElementsByCoords(table, coords);
  return elements[0] || null;
}

function getInputElementsByCoords(
  table: HTMLTableElement,
  coords: CellCoords,
): HTMLCellInputElement[] {
  const cell = getCellByCoords(table, coords);
  return Array.from(cell.querySelectorAll(inputElementSelector));
}

const inputElementSelector = 'input, textarea, button';

function getCellByCoords(table: HTMLTableElement, coords: CellCoords): HTMLTableCellElement {
  const row = table.rows[coords.row];
  return row.cells[coords.column];
}

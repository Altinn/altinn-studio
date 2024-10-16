import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';

export function activateTabbingOnFirstInputElement(table: HTMLTableElement) {
  getFirstInputElement(table)?.setAttribute('tabindex', '0');
}

function getFirstInputElement(table: HTMLTableElement): HTMLCellInputElement | null {
  return table?.querySelector('input, textarea, button');
}

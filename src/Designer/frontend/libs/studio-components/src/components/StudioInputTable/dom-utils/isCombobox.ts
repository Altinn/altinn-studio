export function isCombobox(element: HTMLInputElement): boolean {
  return element.getAttribute('role') === 'combobox';
}

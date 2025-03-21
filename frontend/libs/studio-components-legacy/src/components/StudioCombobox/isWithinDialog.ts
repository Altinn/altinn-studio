export function isWithinDialog(element: HTMLElement): boolean {
  return !!element?.closest('dialog');
}

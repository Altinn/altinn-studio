export function isFocusInsideOrLost(root: HTMLElement | null): boolean {
  const { activeElement } = document;
  return activeElement === document.body || Boolean(root?.contains(activeElement));
}

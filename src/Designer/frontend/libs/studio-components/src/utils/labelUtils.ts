export function hasAriaLabelledBy(
  props: Record<string, unknown>,
): props is { 'aria-labelledby': string } {
  return typeof props['aria-labelledby'] === 'string';
}

export function hasAriaLabel(props: Record<string, unknown>): props is { 'aria-label': string } {
  return typeof props['aria-label'] === 'string';
}

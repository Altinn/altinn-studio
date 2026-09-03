/**
 * Filter callback for the Designsystemet Suggestion/Combobox. Matches the option's label (or the
 * displayed text) and its description against the current search text. When there is no search text,
 * or the search text equals a currently selected label, all options are shown.
 */
export function optionFilter(
  args: {
    label?: string;
    text: string;
    optionElement?: HTMLOptionElement;
    input: HTMLInputElement;
  },
  selectedLabels: string[] = [],
): boolean {
  const { optionElement, input, text, label } = args;
  const search = input.value.toLowerCase();
  const labelLower = (label || text).toLowerCase();
  const desc = optionElement?.getAttribute('aria-description')?.toLowerCase();

  // Show all options if no search text is entered or a selected values label is equal to the search text
  if (
    !search ||
    (selectedLabels.length > 0 && selectedLabels.some((label) => label.toLowerCase() === search))
  ) {
    return true;
  }

  return labelLower.includes(search) || (!!desc && desc.includes(search));
}

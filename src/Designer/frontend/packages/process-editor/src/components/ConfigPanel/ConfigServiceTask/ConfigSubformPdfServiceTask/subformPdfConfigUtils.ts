/**
 * The error that must be fixed before a required subform pdf value can be saved.
 *
 * The runtime checks the same thing, and refuses to run the task without it:
 * `AltinnSubformPdfConfiguration.Validate` rejects a value that is null, empty or whitespace and
 * throws `ApplicationConfigException`. Presence is all this can check: the component id can always
 * be typed rather than picked, and a typed value is only resolvable once the app runs.
 * @param value the value the developer entered.
 * @returns a translation key, or null when there is nothing to report.
 */
export const getRequiredSubformPdfValueErrorKey = (value: string): string | null => {
  if (!value?.trim()) return 'validation_errors.required';
  return null;
};

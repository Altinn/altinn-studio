const integerPattern = /^-?\d+$/;

/**
 * Returns the translation key for the validation message, or `undefined` when the value is
 * acceptable. Kept free of i18n so the rule can be unit-tested on its own.
 *
 * An empty value is not an error here - the field deletes the entry rather than writing an empty
 * one.
 */
export const getIntegerValueErrorKey = (value: string): string | undefined => {
  const trimmedValue = value.trim();
  if (!trimmedValue || integerPattern.test(trimmedValue)) return undefined;
  return 'process_editor.configuration_panel.environment_config.integer_error';
};

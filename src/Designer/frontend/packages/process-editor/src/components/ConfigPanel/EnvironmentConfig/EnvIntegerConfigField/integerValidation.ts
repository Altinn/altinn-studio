/** What `int.TryParse` reads: digits with an optional sign and surrounding whitespace. */
const integerPattern = /^[+-]?\d+$/;
const smallestIntegerValue = -2147483648;
const largestIntegerValue = 2147483647;

export const isIntegerValue = (value: string): boolean =>
  integerPattern.test(value.trim()) && !isOutOfIntegerRange(value);

/**
 * The translation key for the validation message, or `undefined` when the value is acceptable. An
 * empty value is acceptable here, since the field removes the entry rather than writing an empty one.
 */
export const getIntegerValueErrorKey = (value: string): string | undefined => {
  if (!value.trim() || isIntegerValue(value)) return undefined;
  if (isOutOfIntegerRange(value)) {
    return 'process_editor.configuration_panel.environment_config.integer_range_error';
  }
  return 'process_editor.configuration_panel.environment_config.integer_error';
};

const isOutOfIntegerRange = (value: string): boolean => {
  const trimmedValue = value.trim();
  if (!integerPattern.test(trimmedValue)) return false;
  const parsedValue = Number(trimmedValue);
  return parsedValue < smallestIntegerValue || parsedValue > largestIntegerValue;
};

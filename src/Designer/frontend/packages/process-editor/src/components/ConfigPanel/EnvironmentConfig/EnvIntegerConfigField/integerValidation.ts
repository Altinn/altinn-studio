/**
 * What `int.TryParse(value, out int result)` reads, which is what the runtime calls: digits with an
 * optional leading sign and surrounding whitespace (`NumberStyles.Integer`), and nothing else - no
 * decimal point, no exponent, no thousands separator.
 */
const integerPattern = /^[+-]?\d+$/;

/** The bounds of the `int` the runtime parses into. A value outside them fails `int.TryParse`. */
const smallestIntegerValue = -2147483648;
const largestIntegerValue = 2147483647;

/**
 * Whether the value is one the runtime's `int.TryParse` would read, which is what the field
 * accepts. A blank value is not one - it is no value at all, which the field expresses by removing
 * the entry rather than by writing an empty one, and which a required field has to report as
 * missing rather than as malformed.
 *
 * The two edges this agrees with the runtime on are worth stating, because the obvious
 * `/^-?\d+$/` disagrees with it on both: `+3` is a number the app boots on, and `2147483648` is a
 * string of digits it does not - and an alert that called the second one valid would stay silent
 * about an app that will not start.
 */
export const isIntegerValue = (value: string): boolean =>
  !isOutOfIntegerRange(value) && integerPattern.test(value.trim());

/**
 * Returns the translation key for the validation message, or `undefined` when the value is
 * acceptable. Kept free of i18n so the rule can be unit-tested on its own.
 *
 * An empty value is not an error here - the field deletes the entry rather than writing an empty
 * one.
 *
 * A whole number the runtime cannot hold gets its own message: telling someone who typed
 * `2147483648` to write a whole number would be telling them to do what they just did.
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

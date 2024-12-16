import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

const emptyArray: IOptionInternal[] = [];
export function verifyAndDeduplicateOptions(options: IOptionInternal[] | undefined, multi: boolean): IOptionInternal[] {
  if (!options) {
    return emptyArray;
  }

  const deduplicated: IOptionInternal[] = [];
  const seenValues = new Set<string>();
  let j = 0;

  for (let i = 0; i < options.length; i++) {
    const option = options[i];

    // Option value is required
    if (option.value == null) {
      window.logErrorOnce('Option has a null value\n', JSON.stringify(option, null, 2));
      deduplicated[j++] = option; // Still add it, for backwards compatibility
    } else {
      // Option value must be unique. If they're not unique, we cannot tell which one is selected when we only have
      // the value from the data model.
      if (seenValues.has(option.value)) {
        window.logWarnOnce(
          'Option was duplicate value (and was removed). With duplicate values, it is impossible to tell which of the options the user selected.\n',
          JSON.stringify(option, null, 2),
        );
        continue;
      }
      seenValues.add(option.value);
      deduplicated[j++] = option;
    }

    // Option used for multiple select should not use empty values
    // If you only select the empty value, the form data will be set to an empty string (""), which we then converted to null
    // so you will not be able to select that value first. It will however work if you select a non-empty value first
    if (multi && option.value?.length === 0) {
      // Error because the behavior will always be very buggy to the end user
      window.logErrorOnce(
        'Option used in multi-select (Checkboxes or MultipleSelect) has an empty value, this will lead to unexpected behavior when saving and reading form data\n',
        JSON.stringify(option, null, 2),
      );
    }

    // Option used for single select can be weird when containing empty values
    // If you only select the empty value, the form data will be set to an empty string (""), which we then converted to null
    // this will cause nothing to be selected. This can be resonable behavor for a Dropdown, but will look very strange in Radiobuttons
    if (!multi && option.value?.length === 0) {
      // Warning because it could be resonable in a Dropdown component
      window.logWarnOnce(
        'Option used in single-select (RadioButtons or Dropdown) has an empty value, this can lead to unexpected behavior when saving and reading form data\n',
        JSON.stringify(option, null, 2),
      );
    }

    // Option label is required (but can be empty)
    if (option.label == null) {
      window.logErrorOnce('Option has a null label\n', JSON.stringify(option, null, 2));
    }

    // Options component with multiple values as stored as comma-separated list, and read by splitting on comma.
    // therefore it will not behave as expected if the value itself contains commas
    if (multi && option.value?.includes(',')) {
      window.logErrorOnce(
        'Option has a value containing a "," since selected values are stored as a comma-separated list this will not work as expected!\n',
        JSON.stringify(option, null, 2),
      );
    }
  }

  return deduplicated;
}

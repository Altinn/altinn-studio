import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

/**
 * Fast method for removing duplicate option values
 */
export function filterDuplicateOptions(options: IOptionInternal[]): IOptionInternal[] {
  const seen = new Set<string>();
  const out: IOptionInternal[] = [];
  let j = 0;
  for (let i = 0; i < options.length; i++) {
    if (!seen.has(options[i].value)) {
      seen.add(options[i].value);
      out[j++] = options[i];
    }
  }
  return out;
}

export function verifyOptions(options: IOptionInternal[] | undefined, multi: boolean): void {
  if (!options) {
    return;
  }

  for (const option of options) {
    // Option value is required
    if (option.value == null) {
      window.logErrorOnce('Option has a null value\n', JSON.stringify(option, null, 2));
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
}

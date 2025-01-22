import type { Option } from '@digdir/designsystemet-react/dist/types/components/form/Combobox/useCombobox';

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

    if (option.value == null) {
      logNullValue(option);
      deduplicated[j++] = option; // Still add it, for backwards compatibility
    } else {
      if (seenValues.has(option.value)) {
        logNonUniqueValue(option);
        continue;
      }
      seenValues.add(option.value);
      deduplicated[j++] = option;
    }

    if (multi) {
      if (option.value?.length === 0) {
        logEmptyValueMulti(option);
      }
      if (option.value?.includes(',')) {
        logIncludesComma(option);
      }
    } else if (option.value?.length === 0) {
      logEmptyValueSingle(option);
    }

    if (option.label == null) {
      logNullLabel(option);
    }
  }

  return deduplicated;
}

function logNullValue(option: IOptionInternal) {
  const { rowNode: _, ...o } = option;
  window.logErrorOnce('Option has a null value\n', JSON.stringify(o, null, 2));
}

/**
 * Option value must be unique. If they're not unique, we cannot tell which one is selected when we only have
 * the value from the data model.
 */
function logNonUniqueValue(option: IOptionInternal) {
  const { rowNode: _, ...o } = option;
  window.logWarnOnce(
    'Option was duplicate value (and was removed). With duplicate values, it is impossible to tell which of the options the user selected.\n',
    JSON.stringify(o, null, 2),
  );
}

/**
 * Option used for multiple select should not use empty values
 * If you only select the empty value, the form data will be set to an empty string (""), which we then converted to null
 * so you will not be able to select that value first. It will however work if you select a non-empty value first
 *
 * Error because the behavior will always be very buggy to the end user
 */
function logEmptyValueMulti(option: IOptionInternal) {
  const { rowNode: _, ...o } = option;
  window.logErrorOnce(
    'Option used in multi-select (Checkboxes or MultipleSelect) has an empty value, this will lead to unexpected behavior when saving and reading form data\n',
    JSON.stringify(o, null, 2),
  );
}

/**
 * Option used for single select can be weird when containing empty values
 * If you only select the empty value, the form data will be set to an empty string (""), which we then converted to null
 * this will cause nothing to be selected. This can be resonable behavor for a Dropdown, but will look very strange in Radiobuttons
 *
 * Warning because it could be reasonable in a Dropdown component
 */
function logEmptyValueSingle(option: IOptionInternal) {
  const { rowNode: _, ...o } = option;
  window.logWarnOnce(
    'Option used in single-select (RadioButtons or Dropdown) has an empty value, this can lead to unexpected behavior when saving and reading form data\n',
    JSON.stringify(o, null, 2),
  );
}

/**
 * Option label is required (but can be empty)
 */
function logNullLabel(option: IOptionInternal) {
  const { rowNode: _, ...o } = option;
  window.logErrorOnce('Option has a null label\n', JSON.stringify(o, null, 2));
}

/**
 * Options component with multiple values as stored as comma-separated list, and read by splitting on comma.
 * therefore it will not behave as expected if the value itself contains commas
 */
function logIncludesComma(option: IOptionInternal) {
  const { rowNode: _, ...o } = option;
  window.logErrorOnce(
    'Option has a value containing a "," since selected values are stored as a comma-separated list this will not work as expected!\n',
    JSON.stringify(o, null, 2),
  );
}

export function optionSearchFilter(inputValue: string, option: Option): boolean {
  const search = inputValue.toLowerCase();
  const label = option.label.toLowerCase();
  const desc = option.description?.toLowerCase();

  return label.includes(search) || (!!desc && desc.includes(search));
}

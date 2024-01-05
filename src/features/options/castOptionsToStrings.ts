import type { IOption } from 'src/layout/common.generated';

/**
 * Casts the option values to strings. In configurations where the option values are numbers, boolean or other types,
 * this is necessary to ensure that the values are correctly compared. Internally, the option values are always
 * stored as strings.
 */
export function castOptionsToStrings<T extends IOption[] | undefined>(options: T): T {
  if (!options) {
    return options;
  }

  const newOptions: IOption[] = [];
  for (const option of options) {
    newOptions.push({
      ...option,
      value: option.value.toString(),
    });
  }
  return newOptions as T;
}

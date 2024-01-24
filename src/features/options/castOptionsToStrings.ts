import type { IRawOption } from 'src/layout/common.generated';

export interface IOptionInternal extends Omit<IRawOption, 'value'> {
  value: string;
}

type ReplaceWithStrings<T> = T extends IRawOption[] ? IOptionInternal[] : T;

/**
 * Casts the option values to strings. In configurations where the option values are numbers, boolean or other types,
 * this is necessary to ensure that the values are correctly compared. Internally, the option values are always
 * stored as strings.
 */
export function castOptionsToStrings<T extends IRawOption[] | undefined>(options: T): ReplaceWithStrings<T> {
  if (!options) {
    return options as ReplaceWithStrings<T>;
  }

  const newOptions: IOptionInternal[] = [];
  for (const option of options) {
    newOptions.push({
      ...option,
      value: option.value.toString(),
    });
  }
  return newOptions as ReplaceWithStrings<T>;
}

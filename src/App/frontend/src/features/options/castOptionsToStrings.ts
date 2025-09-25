import type { IDataModelReference, IRawOption } from 'src/layout/common.generated';

export interface IOptionInternal extends Omit<IRawOption, 'value'> {
  value: string;

  /**
   * When fetching options from the data model, if the source path is bound to a RepeatingGroup component, this may
   * be set to the data model location for each row/option. This is useful in `optionFilter` (and is currently only set
   * when that property is present), so that the filter can work per-row as well as per-option.
   *
   * @see useSourceOptions
   */
  dataModelLocation?: IDataModelReference;
}

/**
 * Casts the option values to strings. In configurations where the option values are numbers, boolean or other types,
 * this is necessary to ensure that the values are correctly compared. Internally, the option values are always
 * stored as strings.
 */
export function castOptionsToStrings(options: IRawOption[]): IOptionInternal[] {
  const newOptions: IOptionInternal[] = [];
  for (const option of options) {
    newOptions.push({
      ...option,
      value: option.value === null ? 'null' : option.value === undefined ? '' : option.value.toString(),
    });
  }
  return newOptions;
}

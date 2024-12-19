import type { IDataModelReference, IRawOption } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IOptionInternal extends Omit<IRawOption, 'value'> {
  value: string;

  /**
   * When fetching options from the data model, if the source path is bound to a RepeatingGroup component, this may
   * be set to the first node in each row, representing a node object per option. This is useful in `optionFilter`
   * (and is currently only set when that property is present), so that the filter can work per-row as well as
   * per-option.
   *
   * @see useSourceOptions
   */
  rowNode?: LayoutNode;
  dataModelLocation?: IDataModelReference;
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
      value: option.value === null ? 'null' : option.value === undefined ? '' : option.value.toString(),
    });
  }
  return newOptions as ReplaceWithStrings<T>;
}

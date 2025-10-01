import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { useIntermediateItem } from 'src/utils/layout/hooks';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { CompIntermediateExact, CompWithBehavior } from 'src/layout/layout';

interface OptionsResult {
  options: IOptionInternal[];
  isFetching: boolean;
}

export function useOptionsFor<T extends CompWithBehavior<'canHaveOptions'>>(
  baseComponentId: string,
  valueType: 'single' | 'multi',
): OptionsResult {
  const item = useIntermediateItem(baseComponentId) as CompIntermediateExact<T>;
  const { unsorted, isFetching } = useFetchOptions({ item });
  const { options } = useFilteredAndSortedOptions({ unsorted, valueType, item });
  return { isFetching, options };
}

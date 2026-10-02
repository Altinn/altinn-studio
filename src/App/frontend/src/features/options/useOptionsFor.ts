import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { CompExternalExact, CompWithBehavior } from 'src/layout/layout';

interface OptionsResult {
  options: IOptionInternal[];
  isFetching: boolean;
}

export function useOptionsFor<T extends CompWithBehavior<'canHaveOptions'>>(
  baseComponentId: string,
  valueType: 'single' | 'multi',
): OptionsResult {
  const config = useComponentConfig(baseComponentId) as CompExternalExact<T>;
  const { unsorted, isFetching } = useFetchOptions({ config });
  const { options } = useFilteredAndSortedOptions({ unsorted, valueType, config });
  return { isFetching, options };
}

import { useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { getComponentBehaviors } from 'src/layout';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
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
  const { unsorted, isFetching, error } = useFetchOptions({ config });
  const { options } = useFilteredAndSortedOptions({ unsorted, valueType, config });
  const isPdf = useIsPdf();
  const bindings = useDataModelBindingsFor(baseComponentId);
  // Attachment options label tags, rather than values in the simple binding.
  const selectionBinding =
    !getComponentBehaviors(config.type).canHaveAttachments && bindings && 'simpleBinding' in bindings
      ? bindings.simpleBinding
      : undefined;
  const valueBindings = useMemo(
    () => (selectionBinding ? { simpleBinding: selectionBinding } : undefined),
    [selectionBinding],
  );
  const rawSelection = FormStore.data.useFreshBindings(valueBindings, 'string').simpleBinding;
  const hasSelection = !selectionBinding || (rawSelection != null && rawSelection !== '');

  // Fetching options in the background may fail for fields that are never printed.
  // Fail the PDF only when a renderer actually needs those options.
  if (isPdf && error && hasSelection) {
    throw error;
  }
  return { isFetching, options };
}

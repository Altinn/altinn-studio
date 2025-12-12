import { useEffect, useState } from 'react';

import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { useStore } from 'zustand';
import type { CommonProps } from 'nextsrc/nextpoc/types/CommonComponentProps';

import { fetchOptions } from 'src/queries/queries';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { Expression } from 'src/features/expressions/types';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompIntermediateExact } from 'src/layout/layout';
import type { ParamValue } from 'src/utils/urls/appUrlHelper';

export function useResolvedOptions(
  component: CompIntermediateExact<'Checkboxes' | 'RadioButtons'>,
  commonProps: CommonProps,
) {
  const [fetchedOptions, setFetchedOptions] = useState<IRawOption[]>();

  // 1. If options are provided directly, store them right away
  useEffect(() => {
    if (fetchedOptions?.length) {
      return;
    }
    // component.options has priority
    if (component.options) {
      setFetchedOptions(component.options);
    }
    // or from the caller in commonProps
    else if (commonProps.options) {
      setFetchedOptions(commonProps.options);
    }
  }, [component.options, commonProps.options]);

  // 2. Build query params from the store (if any)
  const optionsQueryParams = useStore(layoutStore, (state) => {
    // If no query parameters exist, return falsy so we skip fetch
    if (!component.queryParameters) {
      return null;
    }
    const qp: Record<string, ParamValue> = {};
    for (const [key, val] of Object.entries(component.queryParameters)) {
      const currentValue = state.evaluateExpression(val as Expression);
      qp[key] = currentValue;
    }
    // Convert to JSON string so we can compare easily in a dependency array
    return JSON.stringify(qp);
  });

  // 3. Fetch if we have a valid optionsId and query params
  useEffect(() => {
    if (!component.optionsId || !optionsQueryParams) {
      return;
    }

    const doFetch = async () => {
      try {
        const url = getOptionsUrl({
          optionsId: component.optionsId!,
          queryParameters: JSON.parse(optionsQueryParams),
        });
        const res = await fetchOptions(url);
        setFetchedOptions(res?.data);
      } catch (err) {
        console.error(err);
      }
    };

    doFetch();
  }, [component.optionsId, optionsQueryParams]);

  return fetchedOptions;
}

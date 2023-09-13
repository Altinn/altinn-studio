import { useMemo } from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { getOptionLookupKey } from 'src/utils/options';
import type { IMapping, IOption, IOptionSource } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IUseGetOptionsParams {
  optionsId: string | undefined;
  mapping?: IMapping;
  queryParameters?: Record<string, string>;
  source?: IOptionSource;
  node: LayoutNode;
}

export function useGetOptions({
  optionsId,
  mapping,
  queryParameters,
  source,
  node,
}: IUseGetOptionsParams): IOption[] | undefined {
  const optionState = useAppSelector((state) => state.optionState.options);
  const sourceOptions = useSourceOptions({ source, node });

  return useMemo(() => {
    if (sourceOptions) {
      return sourceOptions;
    }

    if (optionsId) {
      const key = getOptionLookupKey({ id: optionsId, mapping, fixedQueryParameters: queryParameters });
      return optionState[key]?.options;
    }

    return undefined;
  }, [optionsId, mapping, optionState, queryParameters, sourceOptions]);
}

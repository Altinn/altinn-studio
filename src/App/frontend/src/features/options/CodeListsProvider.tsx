import { useCallback } from 'react';

import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export type CodeListSelector = (optionsId: string) => IOptionInternal[] | undefined;

export function useCodeListSelector(): CodeListSelector {
  const staticOptions = FormBootstrap.useStaticOptionsMap();
  return useCallback(
    (optionsId: string) => {
      const variants = staticOptions[optionsId]?.variants;
      if (!variants || variants.length === 0) {
        return undefined;
      }

      const noParamsVariant = variants.find((variant) => Object.keys(variant.queryParameters ?? {}).length === 0);
      return noParamsVariant?.options ?? variants[0].options;
    },
    [staticOptions],
  );
}

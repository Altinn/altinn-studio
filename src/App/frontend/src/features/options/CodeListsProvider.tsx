import { useCallback } from 'react';

import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export type CodeListSelector = (optionsId: string) => IOptionInternal[] | undefined;

export function useCodeListSelector(): CodeListSelector {
  const staticOptions = FormBootstrap.useStaticOptionsMap();
  return useCallback((optionsId: string) => staticOptions[optionsId], [staticOptions]);
}

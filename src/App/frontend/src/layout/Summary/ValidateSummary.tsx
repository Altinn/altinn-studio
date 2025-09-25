import { useEffect } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { NodeValidationProps } from 'src/layout/layout';

export function ValidateSummary({ intermediateItem, externalItem }: NodeValidationProps<'Summary'>) {
  const addError = NodesInternal.useAddError();
  const targetType = useLayoutLookups().allComponents[externalItem.componentRef]?.type;

  useEffect(() => {
    if (!targetType) {
      const error = `Målet for oppsummeringen (${externalItem.componentRef}) ble ikke funnet`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
    // TODO: This would be nice to have, but it would possibly fail in prod for 'ssb/ra0709-01'. Investigate the
    // effects of point a Summary to another Summary first.
    // if (targetType === 'Summary' || targetType === 'Summary2') {
    //   const error = `Oppsummeringen refererer til en annen oppsummering (${externalItem.componentRef})`;
    //   addError(error, node);
    //   window.logErrorOnce(`Validation error for '${node.id}': ${error}`);
    // }
  }, [addError, externalItem.componentRef, intermediateItem.id, targetType]);

  return null;
}

import { useEffect } from 'react';

import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { NodeValidationProps } from 'src/layout/layout';

export function ValidateSummary({ node, externalItem }: NodeValidationProps<'Summary'>) {
  const addError = NodesInternal.useAddError();
  const targetType = NodesInternal.useTypeFromId(externalItem.componentRef);

  useEffect(() => {
    if (!targetType) {
      const error = `Målet for oppsummeringen (${externalItem.componentRef}) ble ikke funnet`;
      addError(error, node);
      window.logErrorOnce(`Validation error for '${node.id}': ${error}`);
    }
    // TODO: This would be nice to have, but it would possibly fail in prod for 'ssb/ra0709-01'. Investigate the
    // effects of point a Summary to another Summary first.
    // if (targetType === 'Summary' || targetType === 'Summary2') {
    //   const error = `Oppsummeringen refererer til en annen oppsummering (${externalItem.componentRef})`;
    //   addError(error, node);
    //   window.logErrorOnce(`Validation error for '${node.id}': ${error}`);
    // }
  }, [addError, externalItem.componentRef, node, targetType]);

  return null;
}

import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function ValidateSummary({ externalItem }: ComponentLayoutValidationProps<'Summary'>) {
  const addError = FormStore.layoutDiagnostics.useAddError();
  const targetType = FormStore.bootstrap.useLayoutLookups().allComponents[externalItem.componentRef]?.type;

  useEffect(() => {
    if (!targetType) {
      const error = `Målet for oppsummeringen (${externalItem.componentRef}) ble ikke funnet`;
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
    // TODO: This would be nice to have, but it would possibly fail in prod for 'ssb/ra0709-01'. Investigate the
    // effects of point a Summary to another Summary first.
    // if (targetType === 'Summary' || targetType === 'Summary2') {
    //   const error = `Oppsummeringen refererer til en annen oppsummering (${externalItem.componentRef})`;
    //   addError(error, node);
    //   window.logErrorOnce(`Validation error for '${node.id}': ${error}`);
    // }
  }, [addError, externalItem.componentRef, externalItem.id, targetType]);

  return null;
}

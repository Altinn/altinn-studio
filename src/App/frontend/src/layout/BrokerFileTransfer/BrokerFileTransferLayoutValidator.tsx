import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { configProblems } from 'src/layout/BrokerFileTransfer/setup/configProblems';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

/** Reports configuration mistakes to the app developer */
export function BrokerFileTransferLayoutValidator({
  externalItem,
}: ComponentLayoutValidationProps<'BrokerFileTransfer'>) {
  const { langAsString } = useLanguage();

  const addError = FormStore.layoutDiagnostics.useAddError();
  useEffect(() => {
    for (const { key, params } of configProblems(externalItem)) {
      const error = langAsString(key, params);
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [addError, externalItem, langAsString]);

  return null;
}

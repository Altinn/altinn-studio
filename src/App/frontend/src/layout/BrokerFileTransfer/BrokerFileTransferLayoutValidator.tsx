import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { getFeature } from 'src/features/toggles';
import { configProblems } from 'src/layout/BrokerFileTransfer/configProblems';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function BrokerFileTransferLayoutValidator({
  externalItem,
}: ComponentLayoutValidationProps<'BrokerFileTransfer'>) {
  const brokerFileTransferEnabled = getFeature('brokerFileTransferEnabled');
  const { langAsString } = useLanguage();

  const addError = FormStore.layoutDiagnostics.useAddError();
  useEffect(() => {
    const errors = configProblems(externalItem).map(({ key, params }) => langAsString(key, params));
    if (!brokerFileTransferEnabled.value) {
      errors.unshift(`You need to enable the feature flag brokerFileTransferEnabled to use this component. Please note that the component is experimental
    and the configuration is likely to change.`);
    }
    for (const error of errors) {
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [addError, externalItem, langAsString, brokerFileTransferEnabled.value]);

  return null;
}

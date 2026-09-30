import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { getFeature } from 'src/features/toggles';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function AddToListFeatureFlagLayoutValidator({ externalItem }: ComponentLayoutValidationProps<'AddToList'>) {
  const simpleTableEnabled = getFeature('addToListEnabled');

  const addError = FormStore.layoutDiagnostics.useAddError();
  useEffect(() => {
    if (!simpleTableEnabled.value) {
      const error = `You need to enable the feature flag addToListEnabled to use this component. Please note that the component is experimental
    and the configuration is likely to change.`;
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [addError, externalItem.id, simpleTableEnabled.value]);

  return null;
}

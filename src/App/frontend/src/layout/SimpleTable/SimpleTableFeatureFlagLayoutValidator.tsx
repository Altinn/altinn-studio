import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { getFeature } from 'src/features/toggles';
import type { NodeValidationProps } from 'src/layout/layout';

export function SimpleTableFeatureFlagLayoutValidator({ intermediateItem }: NodeValidationProps<'SimpleTable'>) {
  const simpleTableEnabled = getFeature('simpleTableEnabled');

  const addError = FormStore.layoutDiagnostics.useAddError();
  useEffect(() => {
    if (!simpleTableEnabled.value) {
      const error = `You need to enable the feature flag simpleTableEnabled to use this component. Please note that the component is experimental

    and the configuration is likely to change.`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, intermediateItem.id, simpleTableEnabled.value]);

  return null;
}
